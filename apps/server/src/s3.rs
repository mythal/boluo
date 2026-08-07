use rusty_s3::{Bucket, Credentials, UrlStyle};
use std::sync::OnceLock;

pub(crate) struct StorageConfig {
    pub(crate) endpoint_url: Option<String>,
    pub(crate) bucket_name: Option<String>,
    pub(crate) access_key_id: Option<String>,
    pub(crate) secret_access_key: Option<String>,
}

pub(crate) struct Storage {
    bucket: Option<Bucket>,
    credentials: Option<Credentials>,
    client: OnceLock<reqwest::Client>,
}

impl Storage {
    pub(crate) fn new(config: StorageConfig) -> Self {
        let bucket = match (config.endpoint_url, config.bucket_name) {
            (None, None) => None,
            (Some(endpoint), Some(name)) => Some(
                Bucket::new(
                    endpoint.parse().expect("Invalid S3_ENDPOINT_URL"),
                    UrlStyle::Path,
                    name,
                    "auto",
                )
                .expect("Failed to initialize S3 bucket config"),
            ),
            _ => panic!("S3_ENDPOINT_URL and S3_BUCKET_NAME must be configured together"),
        };
        let credentials = match (config.access_key_id, config.secret_access_key) {
            (None, None) => None,
            (Some(key), Some(secret)) => Some(Credentials::new(key, secret)),
            _ => panic!("S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be configured together"),
        };
        if bucket.is_some() != credentials.is_some() {
            panic!("S3 bucket and credentials must be configured together");
        }
        Self {
            bucket,
            credentials,
            client: OnceLock::new(),
        }
    }

    pub(crate) fn disabled() -> Self {
        Self::new(StorageConfig {
            endpoint_url: None,
            bucket_name: None,
            access_key_id: None,
            secret_access_key: None,
        })
    }

    pub(crate) fn bucket(&self) -> &Bucket {
        self.bucket.as_ref().expect("S3 storage is not configured")
    }

    pub(crate) fn credentials(&self) -> &Credentials {
        self.credentials
            .as_ref()
            .expect("S3 storage is not configured")
    }

    pub(crate) fn client(&self) -> &reqwest::Client {
        self.client.get_or_init(reqwest::Client::new)
    }
}
