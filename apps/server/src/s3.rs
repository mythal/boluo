use std::sync::OnceLock;

use aws_sdk_s3::Config;

fn make_config() -> Config {
    use aws_credential_types::Credentials;
    use std::env;
    let access_key = env::var("S3_ACCESS_KEY_ID").expect("S3_ACCESS_KEY_ID is not set");
    let secret_access_key = env::var("S3_SECRET_ACCESS_KEY").expect("S3_SECRET_ACCESS_KEY is not set");
    let endpoint_url = env::var("S3_ENDPOINT_URL").expect("S3_ENDPOINT_URL is not set");

    let credentials = Credentials::new(access_key, secret_access_key, None, None, "boluo");
    let credentials_provider = aws_credential_types::provider::SharedCredentialsProvider::new(credentials);
    Config::builder()
        .behavior_version_latest()
        // Fix DNS resolution error
        .force_path_style(true)
        .region(aws_sdk_s3::config::Region::new("auto"))
        .endpoint_url(endpoint_url)
        .credentials_provider(credentials_provider)
        .build()
}

fn get_config() -> &'static Config {
    static SDK_CONFIG: OnceLock<Config> = OnceLock::new();
    SDK_CONFIG.get_or_init(make_config)
}

pub fn get_client() -> &'static aws_sdk_s3::Client {
    static CLIENT: OnceLock<aws_sdk_s3::Client> = OnceLock::new();
    CLIENT.get_or_init(|| aws_sdk_s3::Client::from_conf(make_config()))
}

pub fn get_bucket_name() -> &'static str {
    static BUCKET_NAME: OnceLock<String> = OnceLock::new();
    BUCKET_NAME.get_or_init(|| std::env::var("S3_BUCKET_NAME").expect("S3_BUCKET_NAME is not set"))
}
