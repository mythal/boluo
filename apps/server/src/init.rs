#[tokio::main]
async fn main() {
    let schema = include_str!("../schema.sql");
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(1)
        .connect(&std::env::var("DATABASE_URL").expect("DATABASE_URL must be set"))
        .await
        .expect("Cannot connect to database");
    sqlx::raw_sql(schema)
        .execute(&pool)
        .await
        .expect("Cannot create schema");
}
