use std::env;
use std::sync::LazyLock;

use std::sync::OnceLock as OnceCell;

static DEBUG: OnceCell<bool> = OnceCell::new();
static SYSTEMD: OnceCell<bool> = OnceCell::new();
static SECRET: OnceCell<String> = OnceCell::new();

fn env_bool<T: AsRef<str>>(s: T) -> bool {
    let s = s.as_ref().trim();
    !(s.is_empty() || s == "0" || s.eq_ignore_ascii_case("false"))
}

pub fn ci() -> bool {
    env::var("CI").map(env_bool).unwrap_or(false)
}

pub fn debug() -> bool {
    *DEBUG.get_or_init(|| env::var("BOLUO_DEBUG").map(env_bool).unwrap_or(false))
}

pub fn media_public_url() -> &'static str {
    static MEDIA_PUBLIC_URL: OnceCell<String> = OnceCell::new();
    MEDIA_PUBLIC_URL.get_or_init(|| {
        let url = env::var("PUBLIC_MEDIA_URL").unwrap_or_default();
        url.trim_end_matches('/').to_owned()
    })
}

pub static SITE_URL: LazyLock<String> = LazyLock::new(|| {
    env::var("SITE_URL").unwrap_or_else(|_| "https://site.boluochat.com".to_string())
});

pub fn secret() -> &'static str {
    let secret_string = if cfg!(test) {
        "just a test".to_string()
    } else {
        env::var("SECRET").expect("environment variable `SECRET` not present")
    };
    SECRET.get_or_init(|| secret_string)
}
