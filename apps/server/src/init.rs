mod config;
use clap::Parser;

#[derive(Parser)]
struct Options {
    /// Database URL
    #[clap(long)]
    database_url: Option<String>,

    /// Whether to load fixtures
    #[clap(long, default_value_t = false)]
    fixtures: bool,
}

#[tokio::main]
async fn main() {
    config::load();
    let options = Options::parse();
    let Some(database_url) = options
        .database_url
        .or_else(|| std::env::var("DATABASE_URL").ok())
    else {
        panic!("--database-url or DATABASE_URL is required");
    };
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .expect("Cannot connect to database");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    if options.fixtures {
        let mut paths: Vec<std::fs::DirEntry> = std::fs::read_dir("./apps/server/fixtures")
            .expect("Cannot read fixtures directory")
            .map(|res| res.expect("Cannot read fixture file"))
            .collect();
        paths.sort_by_key(|entry| entry.file_name());
        for path in paths {
            let sql = std::fs::read_to_string(path.path()).expect("Cannot read fixture file");
            sqlx::raw_sql(&sql)
                .execute(&pool)
                .await
                .expect("Failed to execute fixture SQL");
        }
    }
}
