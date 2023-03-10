const Source = require('./').SourceControl;

module.exports = {

  // Jira integration
  jira: {

    // API
    api: {
      host: "",
      username: "",
      password: ""
    },

    // Jira base web URL
    // Set to the base URL for your Jira account
    baseUrl: '',

    // Regex used to match the issue ticket key
    // Use capture group one to isolate the key text within surrounding characters (if needed).
    ticketIDPattern: /((?!([A-Z0-9a-z]{1,10})-?$)[A-Z]{1}[A-Z0-9]+-\d+)/i,

    // Status names that mean the ticket is approved.
    approvalStatus: [
      'Done',
      'Closed',
      'Accepted'
    ],

    // Tickets to exclude from the changelog, by type name
    excludeIssueTypes: [
    ],

    // Tickets to include in changelog, by type name.
    // If this is defined, `excludeIssueTypes` is ignored.
    includeIssueTypes: [],

    // Get the release version name to use when using `--release` without a value.
    // Returns a Promise
    generateReleaseVersionName: function() {
      return Promise.resolve(Source.getLatestTag());
    }
  },

  // Gitlab API integration
  gitlab: {
    api: {
      user: '', // can be the organization/username as well
      host: '',
      apiKey: ''
    },
    gmud: {
      user: '', // can be the organization/username as well
    }
  },

  // Slack API integration
  slack: {

    // API key string
    apiKey: '',

    // The channel that the changelog will be posted in, when you use the `--slack` flag.
    // This can be a channel string ('#mychannel`) or a channel ID.
    channel: '',

    // The name to give the slack bot user, when posting the changelog
    username: "Changelog Bot",

    // Emoji to use for the bot icon.
    // Cannot be used at the same time as `icon_url`
    icon_emoji: ":clipboard:",

    // URL to an image to use as the icon for the bot.
    // Cannot be used at the same time as `icon_emoji`
    icon_url: undefined,

    // notify your gmud channel
    gmud: {
      // This can be a channel string ('#mychannel`) or a channel ID.
      channel: '',
      template:
      `
DATA E HORA: Ap??s aprova????o da GMUD
APLICACA????O: <%= projectName %>
TIPO: Melhorias
RISCO: Baixo
INDISPONIBILIDADE: N??o
<% if (summary) {%>
MOTIVO: <%= summary %>
<% } %>

CHANGELOG
<% sessionTypes.forEach((type) => { %><% if (sessions[type].length) {%>
<%= type %>
<% sessions[type].forEach((ticket) => { %>* <%- ticket.fields.summary %>
<% }); -%><% } %><% }); -%>

MR's:
<% mergedRequests.forEach((mr) => { %>- <%= mr.web_url %>
<% }); -%>

RELEASE:
- <%= gitlabHost %>/<%= gitlabUser %>/<%= projectName %>/tags/<%= latestTag %>

COMPARE:
- <%= gitlabHost %>/<%= gitlabUser %>/<%= projectName %>/compare/<%= previousTag %>...<%= latestTag %>

ROLLBACK:
- <%= gitlabHost %>/<%= gitlabUser %>/<%= projectName %>/tags/<%= previousTag %>

COMMITTERS:
<% committers.forEach((committer) => { %>- <%= committer.name %> (<%= '@'+committer.username %>)
<% }); -%>
`
    }
  },

  // Github settings
  sourceControl: {

    // Default range for commits.
    // This can include from/to git commit references
    // and or after/before datestamps.
    defaultRange: {
      from: "origin/prod",
      to: "origin/stage"
    }
  },

  // Transforms the basic changelog data before it goes to the template.
  //  data - The changlelog data.
  transformData: function(data) {
    return Promise.resolve(data);
  },

  // Transform the changelog before posting to slack
  //  content - The changelog content which was output by the command
  //  data - The data which generated the changelog content.
  transformForSlack: function(content, data) {
    return Promise.resolve(content);
  },

  // The template that generates the output, as an ejs template.
  // Learn more: http://ejs.co/
  template:
`<% if (jira.releaseVersions && jira.releaseVersions.length) {  %>
#### RELEASES
<% jira.releaseVersions.forEach((release) => { %>
  [jira](<%= jira.baseUrl + '/projects/' + release.projectKey + '/versions/' + release.id -%>) /
<% }); -%>
 [gitlab](<%= gitlabHost %>/<%= gitlabUser %>/<%= projectName %>/tags/<%= jira.releaseVersions[0].name -%>)
<% } %>

<%= summary %>

----------

#### [Full Changelog](<%= gitlabHost %>/<%= gitlabUser %>/<%= projectName %>/compare/<%= previousTag %>...<%= latestTag %>)
----------

<% sessionTypes.forEach((type) => { %>
<% if (sessions[type].length) {%>
<%= type %>
  <% sessions[type].forEach((ticket) => { %>
* [<%= ticket.key %>](<%= jira.baseUrl + '/browse/' + ticket.key %>) - <%- ticket.fields.summary %>
  <% }); -%>
<% } %>
<% }); -%>
<% if (!tickets.all.length) {%> ~ None ~ <% } %>
----------

##### MR's

<% mergedRequests.forEach((mr) => { %>
- [<%= '#'+mr.iid %>](<%= mr.web_url %>) - <%= mr.title %>
<% }); -%>
----------

<% if (!tickets.pendingByOwner.length) {%> ~ None. Yay! ~ <% } %>
<% if (committers.length) {%>
##### Committers: **<%= committers.length -%>**
<% committers.forEach((committer) => { %>
* <%= committer.name %> (<%= '@'+committer.username %>)
<% }); -%>
<% } %>
`
};
