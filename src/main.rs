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
  github_token: String,
  date: NaiveDate,
}

// This function does not consume the arguments
fn main() -> Result<(), Box<dyn std::error::Error>> {
  let args: Args = Args::parse();
  let changelog: Changelog = Changelog {
    owner: args.owner,
    project: args.project,
    release: args.release,
    github_token: args.github_token,
    date: NaiveDate::from_ymd_opt(2021, 1, 1).unwrap(),
  };

  println!("{:?}", changelog.release);
  println!("{:?}", changelog.github_token);
  println!("{:?}", changelog.owner);
  println!("{:?}", changelog.project);

  let future = github_graphql::get_pull_requests(
    &changelog.owner,
    &changelog.project,
    &changelog.release,
    &changelog.github_token,
  );
  let pull_requests = block_on(future);
  println!("hey {:?}", pull_requests);
  println!("{}", changelog.render().unwrap());
  Ok(())
}
