use opendal::layers::LoggingLayer;
use opendal::services;
use opendal::Operator;
use opendal::Result;
use std::sync::OnceLock;

static S3_OPERATOR: OnceLock<Operator> = OnceLock::new();

pub fn get_storage_operator() -> Operator {
    S3_OPERATOR
        .get_or_init(|| {
            use std::env;
            let access_key = env::var("S3_ACCESS_KEY_ID").expect("S3_ACCESS_KEY_ID is not set");
            let secret_access_key = env::var("S3_SECRET_ACCESS_KEY").expect("S3_SECRET_ACCESS_KEY is not set");
            let endpoint_url = env::var("S3_ENDPOINT_URL").expect("S3_ENDPOINT_URL is not set");
            let bucket = env::var("S3_BUCKET_NAME").expect("S3_BUCKET_NAME is not set");
            let region = env::var("S3_REGION").unwrap_or(String::from("auto"));
            let builder = services::S3::default()
                .access_key_id(&access_key)
                .secret_access_key(&secret_access_key)
                .endpoint(&endpoint_url)
                .region(&region)
                .bucket(&bucket);
            Operator::new(builder)
                .unwrap()
                // Init with logging layer enabled.
                .layer(LoggingLayer::default())
                .finish()
        })
        .clone()
}

pub async fn check() -> Result<()> {
    let op = get_storage_operator();
    let filename = uuid::Uuid::new_v4().as_simple().to_string() + ".txt";
    // Write data
    op.write(&filename, "Hello, World!")
        .await
        .expect("Failed to write to the storage backend");

    // Read data
    let _ = op
        .read(&filename)
        .await
        .expect("Failed to read from the storage backend");

    // Fetch metadata
    let _meta = op
        .stat(&filename)
        .await
        .expect("Failed to stat from the storage backend");
    // Delete
    op.delete(&filename).await?;

    Ok(())
}
