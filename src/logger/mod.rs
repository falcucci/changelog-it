use env_logger::Builder;

pub fn init() {
  Builder::new().filter(None, log::LevelFilter::Info).init();
}
