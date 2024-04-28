use std::sync::OnceLock;

pub fn get_postgres_url() -> String {
    let key = if cfg!(test) {
        dotenv::dotenv().ok();
        dotenv::from_filename(".env.local").ok();
        dotenv::from_filename(".env.test.local").ok();
        "TEST_DATABASE_URL"
    } else {
        "DATABASE_URL"
    };

    std::env::var(key).expect("Failed to load Postgres connect URL")
}

pub async fn get() -> sqlx::Pool<sqlx::Postgres> {
    static POOL: OnceLock<sqlx::Pool<sqlx::Postgres>> = OnceLock::new();
    if let Some(pool) = POOL.get() {
        pool.clone()
    } else {
        let pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(5)
            .connect(&get_postgres_url())
            .await
            .expect("Cannot connect to database");
        POOL.get_or_init(move || pool).clone()
    }
}
