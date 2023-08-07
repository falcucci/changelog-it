use askama::Template;
use chrono::NaiveDate;
use clap::Parser;
use futures::executor::block_on;

mod github_graphql;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
  /// Name of the person to greet
  #[arg(short, long)]
  release: String,

  #[arg(short, long)]
  owner: String,

  #[arg(short, long)]
  project: String,

  /// github token
  #[arg(short, long)]
  github_token: String,
}

#[derive(Template)]
#[template(path = "changelog.md")]
struct Changelog {
  owner: String,
  project: String,
  release: String,
  date: NaiveDate,
  pull_requests: String,
  contributors: String,
  labels: String,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
  let args: Args = Args::parse();

  let future = github_graphql::get_pull_requests(
    &args.owner,
    &args.project,
    &args.release,
    &args.github_token,
  );

  let pull_requests = block_on(future);
  let pr_markdown = github_graphql::format_pull_requests_to_md(&pull_requests);
  let contributors = github_graphql::format_contributors_to_md(&pull_requests);
  let labels = github_graphql::format_labels_to_md(&pull_requests);
  let changelog = Changelog {
    owner: args.owner,
    project: args.project,
    release: args.release,
    date: NaiveDate::from_ymd_opt(2021, 1, 1).unwrap(),
    pull_requests: pr_markdown,
    contributors,
    labels,
  };

  println!("{}", changelog.render().unwrap());
  Ok(())
}
