use ::reqwest::blocking::Client;
use graphql_client::{reqwest::post_graphql_blocking, GraphQLQuery};
use reqwest::header::{HeaderValue, ACCEPT, AUTHORIZATION, USER_AGENT};

use milestone_query::MilestoneQueryRepositoryMilestonesNodesPullRequestsNodes;

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

pub async fn get_pull_requests(
  owner: &str,
  name: &str,
  milestone: &str,
  token: &str,
) -> Result<Vec<PullRequest>, Box<dyn std::error::Error>> {
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

pub fn format_pull_requests_to_md(
  pull_requests: &Result<std::vec::Vec<PullRequest>, std::boxed::Box<dyn std::error::Error>>,
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

pub fn format_contributors_to_md(
  pull_requests: &Result<std::vec::Vec<PullRequest>, std::boxed::Box<dyn std::error::Error>>,
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

pub fn format_labels_to_md(
  pull_requests: &Result<std::vec::Vec<PullRequest>, std::boxed::Box<dyn std::error::Error>>,
) -> String {
  match pull_requests {
    Ok(pull_requests) => {
      let mut labels = String::new();
      pull_requests.iter().for_each(|pr| {
        pr.labels.iter().for_each(|label| {
          labels.push_str(&format!("- {}\n", label.name,));
        });
      });
      labels.to_string()
    }
    Err(e) => format!("Error: {}", e),
  }
}
