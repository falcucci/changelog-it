use ::reqwest::blocking::Client;
use graphql_client::{reqwest::post_graphql_blocking, GraphQLQuery};
use log::info;

use crate::github_graphql;

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

struct PullRequest {
  id: String,
  title: String,
  url: URI,
  number: i64,
  labels: Vec<Label>,
}

fn set_headers(token: &str) -> ::reqwest::header::HeaderMap {
  let mut headers = ::reqwest::header::HeaderMap::new();
  headers.insert(
    ::reqwest::header::USER_AGENT,
    ::reqwest::header::HeaderValue::from_static("rust-lang/rust"),
  );
  headers.insert(
    ::reqwest::header::ACCEPT,
    ::reqwest::header::HeaderValue::from_static("application/json"),
  );
  headers.insert(
    ::reqwest::header::AUTHORIZATION,
    format!("Bearer {}", token).parse().unwrap(),
  );
  headers
}

pub async fn get_pull_requests(
  owner: &str,
  name: &str,
  milestone: &str,
  token: &str,
  // ) -> Result<graphql_client::Response<milestone_query::ResponseData>, Box<dyn std::error::Error>> {
) -> Result<(), Box<dyn std::error::Error>> {
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
  Ok(())
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
    })
    .collect::<Vec<PullRequest>>()
}

fn get_labels(
  pr: &std::option::Option<
    github_graphql::milestone_query::MilestoneQueryRepositoryMilestonesNodesPullRequestsNodes,
  >,
) -> Vec<Label> {
  pr.as_ref()
    .unwrap()
    .labels
    .as_ref()
    .unwrap()
    .nodes
    .iter()
    .flat_map(|labels_nodes| labels_nodes.iter())
    .map(|label| Label {
      name: label.as_ref().unwrap().name.clone(),
    })
    .collect::<Vec<Label>>()
}

// pr
// .as_ref()
// .unwrap()
// .labels
// .as_ref()
// .unwrap()
// .nodes
// .iter()
// .flat_map(|labels| {
//   labels.iter().map(|label| Label {
//     name: label.as_ref().unwrap().name.clone(),
//   })
// })
// .collect(),
