use tracing_subscriber::{EnvFilter, fmt, layer::SubscriberExt, util::SubscriberInitExt};

pub fn setup_logger(debug: bool) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let level = if debug { "debug" } else { "info" };

    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(format!("server={},tower_http=info", level)));

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
    Ok(())
}
