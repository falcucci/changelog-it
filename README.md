Changelog-it
------------------------

Generates a changelog of Jira issues from your git history and, optionally, attach all issues to a release.

For example:

```bash
$ changelog-it --range origin/prod...origin/master -s --release
```

## how it looks like?

#### RELEASES

[jira](https:///versions/45343) /
[gitlab](https:///tags/v5.8.24)


Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sit hoc ultimum bonorum, quod nunc a me defenditur; Quos quidem tibi studiose et diligenter tractandos magnopere censeo. Quae duo sunt, unum facit. Negat enim summo bono afferre incrementum diem. 

----------

#### [Full Changelog](https:///v5.8.23...v5.8.24)
----------

:dizzy: **Enhancement**
  
* [JIRA-38](https://-38) - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Poterat autem inpune
  
:bug: **Bug Fixes**
  
* [JIRA-67](https://magazineluiza.atlassian.net/browse/SQDVENDAS-67) - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Poterat autem inpune.
  
* [JIRA-23](https://magazineluiza.atlassian.net/browse/SQDVENDAS-23) - ALorem ipsum dolor sit amet, consectetur adipiscing elit. Poterat autem inpune.

:house: **Internal**
  
* [JIRA-53](https://-53) - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Poterat autem inpune.
  
* [JIRA-13](https://-13) - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Poterat autem inpune.

----------

##### MR's

- [#518](https:///merge_requests/518) - SQDVENDAS-38 - feature: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
- [#518](https:///merge_requests/518) - SQDVENDAS-38 - feature: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
- [#518](https:///merge_requests/518) - SQDVENDAS-38 - feature: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
- [#518](https:///merge_requests/518) - SQDVENDAS-38 - feature: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
- [#518](https:///merge_requests/518) - SQDVENDAS-38 - feature: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
- [#518](https:///merge_requests/518) - SQDVENDAS-38 - feature: Lorem ipsum dolor sit amet, consectetur adipiscing elit.

----------

##### Committers: **1**

* Alexsander Falcucci (@falcucci)


You can also have it automatically post to slack!

## How it works

The script looks for Jira issue keys, surrounded by square brackets (i.e. `[DEV-123]`), in the git commit logs. When it finds one, it associates that Jira issue ticket with that commit and adds it to the changelog.


## Installation

```bash
npm install -g jira-changelog
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
jira-changelog --range origin/prod...origin/master
```

Assuming you deploy from the prod branch, this will generate a changelog with all commits after the last production deploy to the current master version.

If you define `sourceControl.defaultRange` in your config, you can run the command with the `--range` flag:

```bash
jira-changelog
```

## Releases

You can automatically attach Jira issues to a release with the `--release` flag. For example, let's say we want to add all issues in the changelog to the "sprint-12" release:

```bash
jira-changelog --range origin/prod...origin/master --release sprint-12
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
jira-changelog --range origin/prod...origin/master --slack
```

## API
The code used to generate the changelogs can also be used as modules in your JavaScript.
See the module source for documentation.

For example:

```bash
npm install -S jira-changelog
```

```javascript
const Config = require('jira-changelog').Config;
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
