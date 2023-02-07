use crate::context::is_systemd;
use fern::colors::{Color, ColoredLevelConfig};
use log::{Level, LevelFilter};

pub fn to_systemd_log_level(level: Level) -> u8 {
    match level {
        Level::Trace => 7,
        Level::Debug => 6,
        Level::Info => 5,
        Level::Warn => 4,
        Level::Error => 3,
    }
}

pub fn setup_logger(debug: bool) -> Result<(), fern::InitError> {
    let level = if debug { LevelFilter::Debug } else { LevelFilter::Info };
    let color_config = ColoredLevelConfig::new()
        .info(Color::Green)
        .error(Color::BrightBlue)
        .warn(Color::BrightYellow)
        .debug(Color::Magenta)
        .trace(Color::BrightCyan);

    fern::Dispatch::new()
        .format(move |out, message, record| {
            if is_systemd() {
                out.finish(format_args!(
                    "<{}>[{}] {}",
                    to_systemd_log_level(record.level()),
                    record.target(),
                    message
                ))
            } else {
                out.finish(format_args!(
                    "[{:>5}]{}[{}] {}",
                    color_config.color(record.level()),
                    chrono::Local::now().format("[%Y-%m-%d][%H:%M:%S]"),
                    record.target(),
                    message
                ))
            }
        })
        .level(LevelFilter::Info) // minimum level needed to output
        .level_for("server", level)
        .chain(std::io::stdout())
        .apply()?;
    Ok(())
}
