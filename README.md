Changelog-it
------------------------

Changelog-it is a command line tool that helps you manage a changelog file for your project. It makes it easy to add new entries to the changelog, and it also provides commands to help you format and present the changelog in a way that is easy for users to read.

The tool is written in JavaScript and can be installed using npm. Once it's installed, you can run changelog-it from the command line to see a list of available commands.

Some of the features of the tool include:

- Adding entries to the changelog: The add command allows you to add a new entry to the changelog. You can specify the type of entry (e.g. `Added`, `Changed`, `Fixed`), a summary of the change, and an optional description.
- Formatting the changelog: The format command can be used to format the changelog in a way that is easy to read. It groups entries by type and sorts them by date.
- Generating a release file: You can use the release command to generate a markdown file with the latest changes and upload it to your repository.
- Customizable templates: You can set custom templates in order to format the generated changelog to your specific needs.
- The tool is flexible and easy to use, and it's a great way to keep track of the changes in your project.

You can start using the tool by installing it with npm, and following the documentation provided in the page for further usage.

here are some available integrations we do to generate the release:

| Jira         |  Github       |   Gitlab       |   Slack        |  
|--------------| --------------|  --------------|  --------------|  

For example:

```bash
changelog-it --range origin/prod...origin/master --release --gmudd --summary "some summary..."
```

take a look on [this](https://github.com/falcucci/changelog-it/blob/master/changelog.example.md) file to check how it will looks like

You can also have it automatically post to slack by using the `--slack` flag.

## How it works

The script looks for Jira issue keys, surrounded by square brackets (i.e. `[DEV-123]`), in the git commit logs. When it finds one, it associates that Jira issue ticket with that commit and adds it to the changelog.

## Installation

```bash
npm install -g -S @falcucci/changelog-it
```

## Configuration

You'll need to configure Jira before you can use this effectively. Create a file called `changelog.config.js` and put it at the root of your workspace directory; where you'll call the `jira-changelog` command from.

Here's a simple example with sample Jira API values:

```javascript
module.exports = {
  jira: {
    api: {
      host: "yoursite.atlassian.net",
      username: "jirauser",
      password: "s00persecurePa55w0rdBr0"
    },
  }
}
```

To see all values suported, look at the `changelog.config.js` file at the root of this repo.

## Usage

```bash
changelog-it --range origin/prod...origin/master --slack --release
```

Assuming you deploy from the prod branch, this will generate a changelog with all commits after the last production deploy to the current master version.

If you define `sourceControl.defaultRange` in your config, you can run the command with the `--range` flag:

```bash
changelog-it
```

## Releases

You can automatically attach Jira issues to a release with the `--release` flag. For example, let's say we want to add all issues in the changelog to the "sprint-12" release:

```bash
changelog-it --range origin/prod...origin/master --release sprint-12
```

This will set the `fixVersions` of all issues to "sprint-12" in Jira.

## Slack

You can also have the script automatically post to slack.

First, get an API token from Slack for your workspace:
https://api.slack.com/tokens

Then add slack to your configuration file:

```javascript
module.exports = {
  slack: {
    apiKey: 'asdlfkjasdoifuoiucvlkxjcvoixucvi',
    channel: '#changelogs'
  },
  jira: {
    api: {
      host: "myapp.atlassian.net",
      username: "jirauser",
      password: "s00persecurePa55w0rdBr0"
    },
  }
}
```

 * Add your API token to `slack.apiKey`.
 * `slack.channel` is the channel you want the script to send the changelog to.

Then simply add the `--slack` flag to the command:

```bash
changelog-it --range origin/prod...origin/master --slack
```

You can automate it generating semantic version tags using the following command:
```bash
curl -LsS https://raw.githubusercontent.com/falcucci/release-me/master/changelog-it.sh | bash -s <semantic-version> <summary>
```
or creating an alias in your `.aliases` file:
```bash
alias release-me='curl -LsS https://raw.githubusercontent.com/falcucci/release-me/master/changelog-it.sh | bash -s $1 $2'
```
and run:
```bash
release-me <semantic-version> <summary>
```

### GitLab CI

**note: this requires npm to run+**

Store the following envs in [GitLab CI variable](https://docs.gitlab.com/ee/ci/variables/#variables).

| name | description |
| ---- | ----------- |
| `GITLAB_API_KEY`  | Gitlab api key |
| `SLACK_API_KEY`   | Slack api key |
| `SLACK_CHANNELS`  | Slack channels ids separeted by comma |
| `GMUD_CHANNEL`    | Slack gmud channels ids separeted by comma |

#### .gitlab-ci.yml sample

```yaml
changelog:
  script:
    - changelog-it v1.0.0...v2.0.0 --release --gmud
    # Or using aliases above if you have it in a package.json
    - npm run changelog
    # Or using some script
    - curl -LsS https://raw.githubusercontent.com/falcucci/release-me/master/ci-changelog-it.sh | bash -s
```

You can use changelog-it to generate changelogs and gmuds from anywhere with following
environment variables.

```shell
$ export GITLAB_API_KEY=haya14busa
$ export SLACK_API_KEY=haya14busa
$ export SLACK_CHANNELS=APOISFDUP
$ export GMUD_CHANNEL=PAOISUFOPUAS
```

## API
The code used to generate the changelogs can also be used as modules in your JavaScript.
See the module source for documentation.

For example:

```bash
npm install -S @falcucci/changelog-it
```

```javascript
const Config = require('@falcucci/changelog-it').Config;
const SourceControl = require('jira-changelog').SourceControl;
const Jira = require('jira-changelog').Jira;

const gitRepoPath = '/home/user/source/'

// Get configuration
const config = Config.getConfigForPath(gitRepoPath);

// Get commits for a range
const source = new SourceControl(config);
const range = {
  from: "origin/prod",
  to: "origin/master"
};
source.getCommitLogs(gitRepoPath, range).then((commitLogs) => {

  // Associate git commits with jira tickets and output changelog object
  const jira = new Jira(config);
  jira.generate(commitLogs).then((changelog) => {
    console.log(changelog);
  });

});
```
