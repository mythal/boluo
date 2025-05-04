use std::env;

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

fn get_domain() -> String {
    env::var("DOMAIN").unwrap_or("boluo.chat".to_string())
}

pub fn media_public_url() -> &'static str {
    static MEDIA_PUBLIC_URL: OnceCell<String> = OnceCell::new();
    MEDIA_PUBLIC_URL.get_or_init(|| {
        let url = env::var("PUBLIC_MEDIA_URL").unwrap_or_default();
        url.trim_end_matches('/').to_owned()
    })
}

pub fn domain() -> &'static str {
    static DOMAIN: OnceCell<String> = OnceCell::new();
    DOMAIN.get_or_init(get_domain)
}

pub fn secret() -> &'static str {
    let secret_string = if cfg!(test) {
        "just a test".to_string()
    } else {
        env::var("SECRET").expect("environment variable `SECRET` not present")
    };
    SECRET.get_or_init(|| secret_string)
}

pub fn is_systemd() -> bool {
    *SYSTEMD.get_or_init(|| env::var("SYSTEMD").map(env_bool).unwrap_or(false))
}
