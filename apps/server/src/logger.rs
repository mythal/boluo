use crate::context::is_systemd;
use tracing_subscriber::{EnvFilter, fmt, layer::SubscriberExt, util::SubscriberInitExt};

pub fn to_systemd_log_level(level: &tracing::Level) -> u8 {
    match *level {
        tracing::Level::TRACE => 7,
        tracing::Level::DEBUG => 6,
        tracing::Level::INFO => 5,
        tracing::Level::WARN => 4,
        tracing::Level::ERROR => 3,
    }
}

pub fn setup_logger(debug: bool) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let level = if debug { "debug" } else { "info" };

    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(format!("server={},tower_http=info", level)));

    if is_systemd() {
        // For systemd, use a simpler format without colors
        tracing_subscriber::registry()
            .with(env_filter)
            .with(
                fmt::layer()
                    .with_target(true)
                    .with_level(true)
                    .with_ansi(false)
                    .with_timer(fmt::time::ChronoUtc::rfc_3339())
                    .event_format(SystemdFormatter),
            )
            .init();
    } else {
        // For non-systemd environments, use colored output
        tracing_subscriber::registry()
            .with(env_filter)
            .with(
                fmt::layer()
                    .with_target(true)
                    .with_level(true)
                    .with_ansi(true)
                    .with_timer(fmt::time::ChronoLocal::rfc_3339())
                    .pretty(),
            )
            .init();
    }
    Ok(())
}

// Custom formatter for systemd-style logging
struct SystemdFormatter;

impl<S, N> fmt::FormatEvent<S, N> for SystemdFormatter
where
    S: tracing::Subscriber + for<'a> tracing_subscriber::registry::LookupSpan<'a>,
    N: for<'a> fmt::FormatFields<'a> + 'static,
{
    fn format_event(
        &self,
        ctx: &fmt::FmtContext<'_, S, N>,
        mut writer: fmt::format::Writer<'_>,
        event: &tracing::Event<'_>,
    ) -> std::fmt::Result {
        let metadata = event.metadata();
        let level_num = to_systemd_log_level(metadata.level());

        write!(writer, "<{}>[{}] ", level_num, metadata.target())?;

        ctx.field_format().format_fields(writer.by_ref(), event)?;

        writeln!(writer)
    }
}
