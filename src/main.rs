use clap::Parser;

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
  let (prs, contributors, labels) = github_graphql::get_changelog_info(&pull_requests);
  let changelog = templates::create_changelog(&args, &prs, &contributors, &labels);
  logger::log_changelog(&changelog);
}
