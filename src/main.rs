use askama::Template;
use chrono::{NaiveDate, Utc};
use clap::Parser;
use env_logger::Builder;
use futures::executor::block_on;
use log::info;

mod github_graphql;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
  #[arg(short, long)]
  release: String,
  #[arg(short, long)]
  owner: String,
  #[arg(short, long)]
  project: String,
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

fn init_logger() {
  Builder::new().filter(None, log::LevelFilter::Info).init();
}

fn main() {
  init_logger();
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
  let today = Utc::now().date_naive();
  let changelog = Changelog {
    owner: args.owner,
    project: args.project,
    release: args.release,
    date: today,
    pull_requests: pr_markdown,
    contributors,
    labels,
  };
  info!("{}", changelog.render().unwrap());
}
