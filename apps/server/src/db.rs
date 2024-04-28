use std::sync::OnceLock;

use crate::database::get_postgres_url;

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
