use askama::Template;
use env_logger::Builder;

use crate::templates::Changelog;

pub fn init() {
  Builder::new().filter(None, log::LevelFilter::Info).init();
}

pub fn log_changelog(changelog: &Changelog) {
  log::info!("{}", changelog.render().unwrap());
}
