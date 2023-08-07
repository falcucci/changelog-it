use env_logger::Builder;

pub fn init_logger() {
  Builder::new().filter(None, log::LevelFilter::Info).init();
}
