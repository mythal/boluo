mod config;
use clap::Parser;

#[derive(Parser)]
struct Options {
    /// Database URL
    #[clap(long, env)]
    database_url: String,
}

#[tokio::main]
async fn main() {
    config::load();
    let options = Options::parse();
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(1)
        .connect(&options.database_url)
        .await
        .expect("Cannot connect to database");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");
}
