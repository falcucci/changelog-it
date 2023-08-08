use std::collections::HashSet;

use ::reqwest::blocking::Client;
use futures::{executor::block_on, future::join3};
use graphql_client::{reqwest::post_graphql_blocking, GraphQLQuery};
use milestone_query::MilestoneQueryRepositoryMilestonesNodesPullRequestsNodes;
use reqwest::header::{HeaderValue, ACCEPT, AUTHORIZATION, USER_AGENT};

#[allow(clippy::upper_case_acronyms)]
type URI = String;

#[derive(GraphQLQuery)]
#[graphql(
  schema_path = "src/github_graphql/schema.graphql",
  query_path = "src/github_graphql/query.graphql",
  response_derives = "Debug"
)]
struct MilestoneQuery;

pub struct Label {
  pub name: String,
}

pub struct Author {
  pub login: String,
  pub url: String,
}

pub struct PullRequest {
  pub id: String,
  pub title: String,
  pub url: URI,
  pub number: i64,
  pub labels: Vec<Label>,
  pub author: Author,
}

fn set_headers(token: &str) -> ::reqwest::header::HeaderMap {
  let mut headers = ::reqwest::header::HeaderMap::new();
  headers.insert(USER_AGENT, HeaderValue::from_static("rust-lang/rust"));
  headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
  headers.insert(AUTHORIZATION, format!("Bearer {}", token).parse().unwrap());
  headers
}

pub fn fetch_pull_requests(args: &super::Args) -> Vec<PullRequest> {
  block_on(get_pull_requests(
    &args.owner,
    &args.project,
    &args.release,
    &args.github_token,
  ))
  .unwrap()
}

pub async fn get_pull_requests(
  owner: &str,
  name: &str,
  milestone: &str,
  token: &str,
) -> Result<Vec<PullRequest>, Box<dyn std::error::Error>> {
  let headers = set_headers(token);
  let client = Client::builder().default_headers(headers).build()?;
  let variables = milestone_query::Variables {
    owner: owner.to_string(),
    name: name.to_string(),
    milestone: milestone.to_string(),
  };
  let response_body = post_graphql_blocking::<MilestoneQuery, _>(
    &client,
    "https://api.github.com/graphql",
    variables,
  )
  .unwrap();
  let response_data: milestone_query::ResponseData =
    response_body.data.expect("missing response data");
  let pull_requests = map_pull_request(&response_data);
  Ok(pull_requests)
}

fn map_pull_request(response_data: &milestone_query::ResponseData) -> Vec<PullRequest> {
  let milestones = response_data
    .repository
    .as_ref()
    .unwrap()
    .milestones
    .as_ref()
    .unwrap();

  let _total_count = milestones.total_count;
  let milestone_nodes = milestones.nodes.iter();

  milestone_nodes
    .flat_map(|nodes| nodes.iter())
    .flat_map(|node| node.as_ref().unwrap().pull_requests.nodes.iter())
    .flat_map(|pull_requests| pull_requests.iter())
    .map(|pr| PullRequest {
      id: pr.as_ref().unwrap().id.clone(),
      title: pr.as_ref().unwrap().title.clone(),
      url: pr.as_ref().unwrap().url.clone(),
      number: pr.as_ref().unwrap().number,
      labels: get_labels(pr),
      author: Author {
        login: pr.as_ref().unwrap().author.as_ref().unwrap().login.clone(),
        url: pr.as_ref().unwrap().author.as_ref().unwrap().url.clone(),
      },
    })
    .collect::<Vec<PullRequest>>()
}

fn get_labels(pr: &Option<MilestoneQueryRepositoryMilestonesNodesPullRequestsNodes>) -> Vec<Label> {
  pr.as_ref()
    .and_then(|pr| pr.labels.as_ref())
    .map(|labels| {
      labels
        .nodes
        .iter()
        .flat_map(|labels_nodes| labels_nodes.iter())
        .map(|label| Label {
          name: label.as_ref().unwrap().name.clone(),
        })
        .collect::<Vec<Label>>()
    })
    .unwrap_or_else(Vec::new)
}

pub fn get_changelog_info(pull_requests: &[PullRequest]) -> (String, String, String) {
  block_on(format_pull_requests_info(pull_requests))
}

pub async fn format_pull_requests_info(pull_requests: &[PullRequest]) -> (String, String, String) {
  let pull_requests_future = format_pull_requests_to_md(pull_requests);
  let contributors_future = format_contributors_to_md(pull_requests);
  let labels_future = format_labels_to_md(pull_requests);
  let (pull_requests, contributors, labels) =
    join3(pull_requests_future, contributors_future, labels_future).await;
  (pull_requests, contributors, labels)
}

pub async fn format_pull_requests_to_md(pull_requests: &[PullRequest]) -> String {
  format_items_to_md(pull_requests, |pr| {
    format!("- [{}]({})\n", pr.title, format_url(pr.url.to_string()))
  })
}

pub async fn format_contributors_to_md(pull_requests: &[PullRequest]) -> String {
  let contributors: String = format_items_to_md(pull_requests, |pr| {
    format!(
      "- [@{}]({})\n",
      pr.author.login,
      format_url(pr.author.url.to_string())
    )
  });

  unify_contributors(contributors)
}

fn unify_contributors(contributors: String) -> String {
  let mut contributors_set = HashSet::new();
  contributors.split('\n').for_each(|contributor| {
    if !contributors_set.contains(contributor) {
      contributors_set.insert(contributor);
    }
  });

  contributors_set
    .iter()
    .map(|contributor| contributor.to_string())
    .collect::<Vec<String>>()
    .join("\n")
}

pub async fn format_labels_to_md(pull_requests: &[PullRequest]) -> String {
  format_items_to_md(pull_requests, |pr| {
    pr.labels
      .iter()
      .map(|label| format!("- {}\n", label.name))
      .collect()
  })
}

fn format_items_to_md<F>(pull_requests: &[PullRequest], format_fn: F) -> String
where
  F: Fn(&PullRequest) -> String,
{
  pull_requests.iter().map(format_fn).collect::<String>()
}

fn format_url(url: String) -> String {
  url
    .replace("api.", "")
    .replace("repos/", "")
    .replace("users/", "")
}
