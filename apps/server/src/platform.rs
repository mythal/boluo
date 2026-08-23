//! Hosting-platform-specific request and instance metadata.

use clap::ValueEnum;

static FLY_REQUEST_ID: hyper::header::HeaderName =
    hyper::header::HeaderName::from_static("fly-request-id");

#[derive(Clone, Copy, Debug, Eq, PartialEq, ValueEnum)]
pub enum Platform {
    Fly,
    #[value(alias = "baremetal")]
    BareMetal,
}

#[derive(Clone, Debug)]
pub struct Runtime {
    platform: Platform,
    node_id: String,
    private_ip: String,
}

impl Runtime {
    pub fn detect(configured: Option<Platform>) -> Self {
        let platform = configured.unwrap_or_else(|| {
            if std::env::var_os("FLY_APP_NAME").is_some() {
                Platform::Fly
            } else {
                Platform::BareMetal
            }
        });
        Self::new(platform)
    }

    fn new(platform: Platform) -> Self {
        let node_id = non_empty_env("NODE_ID")
            .or_else(|| platform.fly_env("FLY_MACHINE_ID"))
            .or_else(|| non_empty_env("HOSTNAME"))
            .unwrap_or_else(|| "unknown".to_owned());
        let private_ip = non_empty_env("PRIVATE_IP")
            .or_else(|| platform.fly_env("FLY_PRIVATE_IP"))
            .unwrap_or_default();
        Self {
            platform,
            node_id,
            private_ip,
        }
    }

    pub fn platform(&self) -> Platform {
        self.platform
    }

    pub fn request_id_header(&self) -> Option<&'static hyper::header::HeaderName> {
        match self.platform {
            Platform::Fly => Some(&FLY_REQUEST_ID),
            Platform::BareMetal => None,
        }
    }

    pub fn node_id(&self) -> &str {
        &self.node_id
    }

    pub fn private_ip(&self) -> &str {
        &self.private_ip
    }
}

impl Platform {
    fn fly_env(self, name: &str) -> Option<String> {
        matches!(self, Self::Fly)
            .then(|| non_empty_env(name))
            .flatten()
    }
}

fn non_empty_env(name: &str) -> Option<String> {
    std::env::var(name).ok().filter(|value| !value.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn explicit_platform_bypasses_detection() {
        let runtime = Runtime::detect(Some(Platform::BareMetal));

        assert_eq!(runtime.platform(), Platform::BareMetal);
        assert!(runtime.request_id_header().is_none());
    }
}
