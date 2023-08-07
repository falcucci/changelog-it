use askama::Template;
use chrono::NaiveDate;

#[derive(Template)]
#[template(path = "changelog.md")]
pub struct Changelog {
  pub owner: String,
  pub project: String,
  pub release: String,
  pub date: NaiveDate,
  pub pull_requests: String,
  pub contributors: String,
  pub labels: String,
}
