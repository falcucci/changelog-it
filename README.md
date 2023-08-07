Changelog-it
------------------------

Changelog-it is a command line tool that helps you manage a changelog file for your project. It makes it easy to add new entries to the changelog, and it also provides commands to help you format and present the changelog in a way that is easy for users to read.

The tool is written in Rust and can be installed using `cargo`. Once it's installed, you can run changelog-it from the command line to see a list of available commands.

Some of the features of the tool include:

- Formatting the changelog: The format command can be used to format the changelog in a way that is easy to read. It groups entries by type and sorts them by date.
- Generating a release file: You can use the release command to generate a markdown file with the latest changes and upload it to your repository.
- Customizable templates: You can set custom templates in order to format the generated changelog to your specific needs.
- The tool is flexible and easy to use, and it's a great way to keep track of the changes in your project.

here are some available integrations we do to generate the release:

|  Github       
| --------------

take a look on [this](https://github.com/falcucci/changelog-it/blob/master/templates/example.md) file to check how it will looks like

## Installation

```bash
cargo install changelog-it
```

To see all values suported, look at the `changelog.config.js` file at the root of this repo.

## Releases

You can automatically attach pull requests to a release with the `--release` flag. For example, let's say we want to add all issues in the changelog to the "1.73.0" release:

```bash
changelog-it --owner rust-lang --project rust --release 1.73.0 --github-token <token>
```

You can automate it generating semantic version tags using the following command:
```bash
curl -LsS https://raw.githubusercontent.com/falcucci/release-me/master/changelog-it.sh | bash -s <semantic-version> <summary>
```
or creating an alias in your `.aliases` file:
```bash
alias release-me='curl -LsS https://raw.githubusercontent.com/falcucci/release-me/master/changelog-it.sh | bash -s $1 $2'
```
