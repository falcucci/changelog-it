#!/usr/bin/env node

/**
 * The jira-changelog CLI
 */

import "@babel/polyfill";
import "source-map-support/register";
import program from "commander";
import _ from "lodash";
import ejs from "ejs";
import path from "path";
import Slack from "./Slack";
import Utils from "./Utils";
import Entities from "html-entities";

import Jira from "./Jira";
import Gitlab from './Gitlab';
import IssueTypes from './IssueTypes';
import SourceControl from "./SourceControl";
import { readConfigFile, CONF_FILENAME } from "./Config";

runProgram();

/**
 * Parse command line arguments
 */
function commandLineArgs() {
  const pkg = require('../package.json');
  program
    .version(pkg.version)
    .option(
      '-c, --config <filepath>',
      'Path to the config file.'
    )
    .option(
      '-r, --range <from>...<to>',
      'git commit range for changelog',
      parseRange
    )
    .option(
      '-d, --date <date>[...date]',
      'Only include commits after this date',
      parseRange
    )
    .option(
      '-d, --date <date>[...date]',
      'Only include commits after this date',
      parseRange
    )
    .option(
      '-s, --slack',
      'Automatically post changelog to slack (if configured)'
    )
    .option(
      '-gl, --gitlab',
      'Automatically generate a release (if configured)'
    )
    .option(
      '--release [release]',
      'Assign a release version to these stories'
    )
    .parse(process.argv);
}

/**
 * Run the main program
 */
async function runProgram() {
  try {
    commandLineArgs();

    // Determine the git workspace path
    let gitPath = process.cwd();
    if (program.args.length) {
      gitPath = program.args[0];
    }
    gitPath = path.resolve(gitPath);

    // Config file path
    var configPath;
    if (program.config) {
      configPath = path.resolve(program.config);
    } else {
      configPath = path.join(gitPath, CONF_FILENAME);
    }

    const config = readConfigFile(configPath);
    const jira = new Jira(config);
    const gitlab = new Gitlab(config);
    const source = new SourceControl(config);
    const isFunction = (
      typeof config.jira.generateReleaseVersionName === "function"
    )

    // Release flag used, but no name passed
    if (program.release === true) {
      /* treatment to let the script working without a release
       * version */
      if (!isFunction) {
        console.log(
          `You need to define the jira.generateReleaseVersionName
          function in your config, if you're not going to pass the
          release version name in the command.`
        );
        return;
      }
      program.release = await config.jira.generateReleaseVersionName();
    }

    // Get logs
    const range = getRangeObject(config);
    const commitLogs = await source.getCommitLogs(gitPath, range);
    const changelog = await jira.generate(commitLogs, program.release);
    const projectName = await source.getProjectName()
    const tagTimestamp = await source.getTagTimestamp()
    const latestTag = await source.getLastestTag()
    const previousTag = await source.getPreviousTag()
    const mergeRequests = await gitlab.getMergeRequests(
      projectName,
      tagTimestamp
    );
    const remoteUrl = await source.getRemoteUrl()

    // Template data template
    let data = await transformCommitLogs(config, changelog);
    if (typeof config.transformData == 'function') {
      data = await Promise.resolve(config.transformData(data));
    }
    data.jira = {
      baseUrl: config.jira.baseUrl,
      releaseVersions: jira.releaseVersions,
    };

    data.mergedRequests = mergeRequests

    data.committers = []
    commitLogs.forEach(commit => {
      /* get the user from slack or just the full name */
      let username = (
        commit.slackUser ?
        commit.slackUser.profile.display_name :
        commit.email
      )
      let name = commit.authorName
      data.committers.push({ username, name } )
    })
    data.committers = _.uniqBy(data.committers, 'username')

    /**
     * map all the Jira issue types
     */
    for (var ticket in data.tickets.all) {
      if (_.has(data.tickets.all[ticket], 'fields.issuetype.name')) {
        /**
         * assign the new names here
         */
        data.tickets.all[ticket].fields.issuetype.name = (
          Utils.mapIssueTypes(
            _.get(data.tickets.all[ticket], 'fields.issuetype.name')
          )
        )
      }
    }

    /**
     * TODO: docstring
     */
    const issueValues = Object.values(IssueTypes)
    data.sessions = {}
    for (const value of issueValues) {
      data.sessions[value] = Utils.mapSessions(
        data.tickets.all,
        { 'fields': { 'issuetype': { 'name': value } } }
      )
    }

    data.sessionTypes = issueValues
    data.projectName = projectName
    data.previousTag = previousTag
    data.latestTag = latestTag
    data.gitlabHost = _.get(config, 'gitlab.api.host')

    // Render and output template
    const entitles = new Entities.AllHtmlEntities();
    const changelogMessage = ejs.render(config.template, data);
    console.log(entitles.decode(changelogMessage));

    // Post to slack
    if (program.slack) {
      postToSlack(
        config,
        data,
        changelogMessage,
        program.release,
        projectName
      );
      if (_.get(config, 'slack.gmud')) {
        const changelogGmudMessage = ejs.render(
          _.get(config, "slack.gmud.template"),
          data
        );
        console.log(entitles.decode(changelogGmudMessage));
        requestGmudApproval(
          config,
          data,
          changelogGmudMessage,
          program.release,
          projectName
        )
      }

    }
  } catch(e) {
    console.error('Error: ', e.stack);
    console.log(e.message);
  }
}

/**
 * Post the changelog to slack
 *
 * @param {Object} config - The configuration object
 * @param {Object} data - The changelog data object.
 * @param {String} changelogMessage - The changelog message
 * @param {String} releaseVersion - The name of the release version to create.
 * @param {String} projectName - The name of the current project
 */
async function requestGmudApproval(
  config,
  data,
  changelogMessage,
  releaseVersion,
  projectName
) {
  const slack = new Slack(config);

  if (!slack.isEnabled() || !config.slack.gmud.channel) {
    console.error('Error: Gmud is not configured.');
    return;
  }

  console.log(`\nPosting changelog message to slack channel: ${config.slack.channel}...`);
  try {

    // Transform for slack
    if (typeof config.transformForSlack === 'function') {
      changelogMessage = await Promise.resolve(
        config.transformForSlack(changelogMessage, data)
      );
    }
    console.log('changelogMessage: ', changelogMessage);
    changelogMessage = '```' + changelogMessage + '```'
    const opts = {
      text: changelogMessage,
      channel: config.slack.gmud.channel,
      as_user: true,
      parse: 'full',
      pretty: 1,
      username: config.slack.username,
      icon_emoji: config.slack.icon_emoji,
      icon_url: config.slack.icon_url
    }

    // Post to slack
    await slack.postMessage(
      opts,
      'chat.postMessage',
      changelogMessage,
      releaseVersion,
      projectName
    );
    console.log('Done');

  } catch(e) {
    console.log('Error: ', e.stack);
  }
}

/**
 * Post the changelog to slack
 *
 * @param {Object} config - The configuration object
 * @param {Object} data - The changelog data object.
 * @param {String} changelogMessage - The changelog message
 * @param {String} releaseVersion - The name of the release version to create.
 * @param {String} projectName - The name of the current project
 */
async function postToSlack(
  config,
  data,
  changelogMessage,
  releaseVersion,
  projectName
) {
  const slack = new Slack(config);

  if (!slack.isEnabled() || !config.slack.channel) {
    console.error('Error: Slack is not configured.');
    return;
  }

  console.log(`\nPosting changelog message to slack channel: ${config.slack.channel}...`);
  try {

    // Transform for slack
    if (typeof config.transformForSlack == 'function') {
      changelogMessage = await Promise.resolve(
        config.transformForSlack(changelogMessage, data)
      );
    }

    const opts = {
      title: `${projectName}-${releaseVersion}`,
      content: changelogMessage,
      filename: `${projectName}-${releaseVersion}`,
      filetype: 'post',
      channels: config.slack.channel,
      as_user: true,
      parse: 'full',
      pretty: 1,
      username: config.slack.username,
      icon_emoji: config.slack.icon_emoji,
      icon_url: config.slack.icon_url
    }

    // Post to slack
    await slack.postMessage(
      opts,
      'files.upload',
      changelogMessage,
      releaseVersion,
      projectName
    );
    console.log('Done');

  } catch(e) {
    console.log('Error: ', e.stack);
  }
}

/**
 * Convert a range string formatted as "a...b" into an array.
 *
 * @param {String} rangeStr - The range string.
 * @return {Array}
 */
function parseRange(rangeStr) {
  return rangeStr.split(/\.{3,3}/);
}

/**
 * Filter commit logs into template data.
 *
 * Data:
 * -----
 *  {
 *    commits: {
 *      all: [],       // all commits
 *      tickets: [],   // commits associated with jira tickets
 *      noTickets: []  // commits not associated with jira tickets
 *    },
 *    tickets: {
 *      all: [],       // all tickets
 *      approved: [],  // tickets marked as approved
 *      pending: [],   // tickets not marked as approved
 *      pendingByOwner: [] // pending tickets arranged under ticket reporters.
 *    }
 *  }
 *
 * @param {Object} config - The config object provided by Config.getConfigForPath
 * @param {Array} logs - List of commit logs and their jira tickets.
 *
 * @return {Promise} Resolves to an object with filtered commit/ticket data
 */
function transformCommitLogs(config, logs) {
  let approvalStatus = config.jira.approvalStatus;
  if (!Array.isArray(approvalStatus)) {
    approvalStatus = [approvalStatus];
  }

  // Tickets and their commits
  const ticketHash = logs.reduce((all, log) => {
    log.tickets.forEach((ticket) => {
      all[ticket.key] = all[ticket.key] || ticket;
      all[ticket.key].commits = all[ticket.key].commits || [];
      all[ticket.key].commits.push(log);
    });
    return all;
  }, {});
  let ticketList = _.sortBy(
    Object.values(ticketHash),
    ticket => ticket.fields.issuetype.name
  );
  let pendingTickets = ticketList.filter(
    ticket => !approvalStatus.includes(ticket.fields.status.name)
  );

  // Pending ticket owners and their tickets/commits
  const reporters = {};
  pendingTickets.forEach((ticket) => {
    const email = ticket.fields.reporter.emailAddress;
    if (!reporters[email]) {
      reporters[email] = {
        email,
        name: ticket.fields.reporter.displayName,
        slackUser: ticket.slackUser,
        tickets: [ticket]
      };
    } else {
      reporters[email].tickets.push(ticket);
    }
  });
  const pendingByOwner = _.sortBy(Object.values(reporters), item => item.user);

  // Output filtered data
  return {
    commits: {
      all: logs,
      tickets: logs.filter(commit => commit.tickets.length),
      noTickets: logs.filter(commit => !commit.tickets.length)
    },
    tickets: {
      pendingByOwner,
      all: ticketList,
      approved: ticketList.filter(ticket => approvalStatus.includes(ticket.fields.status.name)),
      pending: pendingTickets
    }
  }
}


/**
 * Construct the range object from the CLI arguments and config
 *
 * @param {Object} config - The config object provided by Config.getConfigForPath
 * @return {Object}
 */
function getRangeObject(config) {
  const range = {};
  const defaultRange = (config.sourceControl && config.sourceControl.defaultRange) ? config.sourceControl.defaultRange : {};

  if (program.range && program.range.length) {
    range.from = program.range[0];
    range.to = program.range[1];
  }
  if (program.dateRange && program.dateRange.length) {
    range.after = program.dateRange[0];
    if (program.dateRange.length > 1) {
      range.before = program.dateRange[1];
    }
  }

  // Use default range
  if (!Object.keys(range).length && Object.keys(defaultRange).length) {
    Object.assign(range, defaultRange);
  }

  if (!Object.keys(range).length){
      throw new Error('No range defined for the changelog.');
  }
  return range;
}
