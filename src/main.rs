use askama::Template;
use clap::Parser;
use log::info;

mod github_graphql;
mod logger;
mod templates;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub struct Args {
  #[arg(short, long)]
  release: String,
  #[arg(short, long)]
  owner: String,
  #[arg(short, long)]
  project: String,
  #[arg(short, long)]
  github_token: String,
}

fn main() {
  logger::init();
  let args: Args = Args::parse();
  let pull_requests = github_graphql::fetch_pull_requests(&args);
  let pr_markdown = github_graphql::format_pull_requests_to_md(&pull_requests);
  let contributors = github_graphql::format_contributors_to_md(&pull_requests);
  let labels = github_graphql::format_labels_to_md(&pull_requests);
  let changelog = templates::create_changelog(&args, &pr_markdown, &contributors, &labels);
  info!("{}", changelog.render().unwrap());
}
