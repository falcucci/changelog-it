use ::reqwest::blocking::Client;
use graphql_client::{reqwest::post_graphql_blocking, GraphQLQuery};
use log::info;
use reqwest::header::{HeaderValue, ACCEPT, AUTHORIZATION, USER_AGENT};

use crate::github_graphql;
use github_graphql::milestone_query::MilestoneQueryRepositoryMilestonesNodesPullRequestsNodes;

#[allow(clippy::upper_case_acronyms)]
type URI = String;

#[derive(GraphQLQuery)]
#[graphql(
  schema_path = "src/github_graphql/schema.graphql",
  query_path = "src/github_graphql/query.graphql",
  response_derives = "Debug"
)]
struct MilestoneQuery;

struct Label {
  name: String,
}

struct Author {
  login: String,
}

pub struct PullRequest {
  pub id: String,
  pub title: String,
  pub url: URI,
  pub number: i64,
  labels: Vec<Label>,
  author: Author,
}

fn set_headers(token: &str) -> ::reqwest::header::HeaderMap {
  let mut headers = ::reqwest::header::HeaderMap::new();
  headers.insert(USER_AGENT, HeaderValue::from_static("rust-lang/rust"));
  headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
  headers.insert(AUTHORIZATION, format!("Bearer {}", token).parse().unwrap());
  headers
}

pub async fn get_pull_requests(
  owner: &str,
  name: &str,
  milestone: &str,
  token: &str,
) -> Result<Vec<github_graphql::PullRequest>, Box<dyn std::error::Error>> {
  let headers = set_headers(token);
  let client = Client::builder().default_headers(headers).build()?;
  // should be a parameter
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
  info!("{:?}", response_data);
  println!("{:?}", response_data);
  let pull_requests = map_pull_request(&response_data);
  pull_requests.iter().for_each(|pr| {
    println!("{:?}", pr.title);
    println!("{:?}", pr.url);
  });
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
