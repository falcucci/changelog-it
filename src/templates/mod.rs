use askama::Template;
use chrono::NaiveDate;
use chrono::Utc;

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

pub fn create_changelog(
    args: &super::Args,
    pr_markdown: &str,
    contributors: &str,
    labels: &str,
) -> Changelog {
    Changelog {
        owner: args.owner.clone(),
        project: args.project.clone(),
        release: args.release.clone(),
        date: Utc::now().date_naive(),
        pull_requests: pr_markdown.to_owned(),
        contributors: contributors.to_owned(),
        labels: labels.to_owned(),
    }
}
