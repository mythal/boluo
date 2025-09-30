pub(crate) fn load() {
    dotenvy::from_filename(".env.local").ok();
    dotenvy::dotenv().ok();
}
