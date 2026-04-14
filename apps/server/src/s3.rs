use rusty_s3::{Bucket, Credentials, UrlStyle};
use std::sync::OnceLock;

pub fn get_bucket() -> &'static Bucket {
    static BUCKET: OnceLock<Bucket> = OnceLock::new();
    BUCKET.get_or_init(|| {
        let endpoint = std::env::var("S3_ENDPOINT_URL").expect("S3_ENDPOINT_URL is not set");
        let name = std::env::var("S3_BUCKET_NAME").expect("S3_BUCKET_NAME is not set");
        Bucket::new(
            endpoint.parse().expect("Invalid S3_ENDPOINT_URL"),
            UrlStyle::Path,
            name,
            "auto",
        )
        .expect("Failed to initialize S3 bucket config")
    })
}

pub fn get_credentials() -> &'static Credentials {
    static CREDENTIALS: OnceLock<Credentials> = OnceLock::new();
    CREDENTIALS.get_or_init(|| {
        let key = std::env::var("S3_ACCESS_KEY_ID").expect("S3_ACCESS_KEY_ID is not set");
        let secret =
            std::env::var("S3_SECRET_ACCESS_KEY").expect("S3_SECRET_ACCESS_KEY is not set");
        Credentials::new(key, secret)
    })
}

pub fn get_http_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(reqwest::Client::new)
}
