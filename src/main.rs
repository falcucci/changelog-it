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
  pull_requests: String,
  contributors: String,
}

// This function does not consume the arguments
fn main() -> Result<(), Box<dyn std::error::Error>> {
  let args: Args = Args::parse();

  let future = github_graphql::get_pull_requests(
    &args.owner,
    &args.project,
    &args.release,
    &args.github_token,
  );

  let pull_requests = block_on(future);
  let pr_markdown = format_pull_requests_to_md(&pull_requests);
  let contributors = format_contributors_to_md(&pull_requests);
  let changelog = Changelog {
    owner: args.owner,
    project: args.project,
    release: args.release,
    github_token: args.github_token,
    date: NaiveDate::from_ymd_opt(2021, 1, 1).unwrap(),
    pull_requests: pr_markdown,
    contributors,
  };

  println!("{}", changelog.render().unwrap());
  Ok(())
}

fn format_pull_requests_to_md(
  pull_requests: &Result<
    std::vec::Vec<github_graphql::PullRequest>,
    std::boxed::Box<dyn std::error::Error>,
  >,
) -> String {
  match pull_requests {
    Ok(pull_requests) => {
      let mut pull_requests_md = String::new();
      pull_requests.iter().for_each(|pr| {
        pull_requests_md.push_str(&format!(
          "- [{}]({})\n",
          pr.title,
          pr.url.to_string().replace("api.", "").replace("repos/", "")
        ));
      });
      pull_requests_md.to_string()
    }
    Err(e) => format!("Error: {}", e),
  }
}

fn format_contributors_to_md(
  pull_requests: &Result<
    std::vec::Vec<github_graphql::PullRequest>,
    std::boxed::Box<dyn std::error::Error>,
  >,
) -> String {
  match pull_requests {
    Ok(pull_requests) => {
      let mut contributors = String::new();
      pull_requests.iter().for_each(|pr| {
        contributors.push_str(&format!(
          "- [{}]({})\n",
          pr.author.login,
          pr.author
            .url
            .to_string()
            .replace("api.", "")
            .replace("users/", "")
        ));
      });
      contributors.to_string()
    }
    Err(e) => format!("Error: {}", e),
  }
}
