import Slack from './Slack';
import git from 'simple-git';
import exec from 'child_process';

/**
 * Connect to the source control system and return commit logs for a range.
 * Currenty this only connects to git.
 *
 * Range Object
 * ------------
 * The range object should contain at least one of the following properties:
 * ```
 * {
 *   from:   {String}  The commit revision or branch name to start from, inclusive.
 *   to:     {String}  The commit revision or branch name to go to, inclusive.
 *   after:  {DateStr} Only commits after this date.
 *   before: {DateStr} Only comits before this date.
 * }
 * ```
 *
 *
 * Commit Log Object
 * ------------------
 * Each commit log object will look like the following:
 *
 * ```
 * {
 *   revision: <commit revision hash>,
 *   date: <date>,
 *   summary: <short commit message>,
 *   fullText: <full commit message>,
 *   authorName: <name of commit author>,
 *   authorEmail: <email of commit author>,
 *   slackUser: <object of slack user, as matched by authorEmail>
 * }
 * ```
 *
 */
export default class SourceControl {

  constructor(config) {
    this.slack = new Slack(config);
  }

  async getProjectName() {
    const baseDirSplited = git()._baseDir.split('/')
    return baseDirSplited[baseDirSplited.length-1]
  }

  getRemoteUrl() {
    return new Promise((resolve, reject) => {
      git().listRemote(['--get-url'], (err, response) => {
        if (err) {
          return reject(err);
        }
        return resolve(response)
      })
    })
  }

  getTagTimestamp() {
    return this.getLastestTag()
      .then(tag => {
        return new Promise((resolve, reject) => {
          git().raw(
            [
              'log',
              tag,
              '-1',
              '--format=%cI'
            ], (err, result) => {
              if (err) {
                return reject(err)
              }
              return resolve(result)
            });
        })
      })
  }

  /**
   * TODO: docstring
   *
   */
  getLastestTag() {
    return new Promise((resolve, reject) => {
      git().tags((err, tags) => {
        if (err) {
          return reject(err)
        }
        return resolve(tags.latest)
      });
    })
  }

  getRev() {
    return new Promise((resolve, reject) => {
      git().raw(
        [
          'rev-list',
          '--tags',
          '--skip=1',
          '--max-count=1'
        ], (err, result) => {
          if (err) {
            return reject(err)
          }
          return resolve(result)
        });
    })
  }

  /**
   * TODO: docstring
   *
   */
  getPreviousTag() {
    return this.getRev().then(rev => {
      return new Promise((resolve, reject) => {
        var yourscript = exec.exec(
          'git describe --abbrev=0 --tags `git rev-list --tags --skip=1 --max-count=1`',
          (error, stdout, stderr) => {
            if (error !== null) {
              console.log(`exec error: ${error}`);
              return reject(err)
            }
            return resolve(stdout.trim())
          });
      })
    })
  }

  /**
   * Return commit logs for a range.
   *
   * @param {String} dir The source control workspace directory.
   * @param {Object} range An object defining the range boundaries (see above)
   *
   * @return {Promsie} Resolves to a list of commit objects
   */
  getCommitLogs(workspaceDir, range) {
    const workspace = git(workspaceDir);

    return new Promise((resolve, reject) => {

      const opts = {
        format: {
          revision: '%H',
          date: '%ai',
          summary: '%s%d',
          fullText: '%s%d%b',
          authorName: '%aN',
          authorEmail: '%ae'
        },
        '--no-merges': true,
        ...range
      }

      workspace.log(opts, (err, response) => {
        if (err) {
          return reject(err);
        }

        const logs = response.all;

        // Add slack users to commit logs
        const promises = logs.map((log) => {
          return this.slack.findUser(log.authorEmail, log.authorName)
            .catch((err) => { console.log(err); }) // ignore errors
            .then((slackUser) => {
              log.slackUser = slackUser;
              return log;
            });
        });
        promises.push(Promise.resolve());

        Promise.all(promises).then(() => {
          resolve(logs);
        });
      });
    });
  }
}
