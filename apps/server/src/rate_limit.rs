use governor::Quota;
use std::num::NonZeroU32;

pub const CLEAN_INTERVAL_S: u64 = 60 * 10;
pub const SHRINK_INTERVAL_S: u64 = 60 * 60;

pub const LOGIN_PER_MINUTE: u32 = 10;

pub const MAIL_GLOBAL_PER_MINUTE: u32 = 120;
pub const REGISTER_EMAIL_PER_HOUR: u32 = 3;
pub const RESET_PASSWORD_EMAIL_PER_HOUR: u32 = 16;
pub const RESEND_EMAIL_VERIFICATION_USER_PER_HOUR: u32 = 5;
pub const EMAIL_CHANGE_EMAIL_PER_HOUR: u32 = 5;

pub const SEND_MESSAGE_USER_PER_MINUTE: u32 = 120;
pub const CREATE_SPACE_USER_PER_HOUR: u32 = 10;
pub const CREATE_CHANNEL_USER_PER_HOUR: u32 = 30;
pub const UPLOAD_USER_PER_HOUR: u32 = 60;

pub fn per_minute(limit: u32) -> Quota {
    Quota::per_minute(NonZeroU32::new(limit).expect("rate limit must be non-zero"))
}

pub fn per_hour(limit: u32) -> Quota {
    Quota::per_hour(NonZeroU32::new(limit).expect("rate limit must be non-zero"))
}

pub fn start_cleanup_task(
    retain_recent: impl Fn() + Send + 'static,
    shrink_to_fit: impl Fn() + Send + 'static,
) {
    tokio::spawn(async move {
        let mut interval = crate::utils::cleaner_interval(CLEAN_INTERVAL_S);
        let mut shrink_interval = crate::utils::cleaner_interval(SHRINK_INTERVAL_S);
        loop {
            tokio::select! {
                _ = interval.tick() => {
                    retain_recent();
                }
                _ = shrink_interval.tick() => {
                    shrink_to_fit();
                }
                _ = crate::shutdown::SHUTDOWN.notified() => {
                    break;
                }
            }
        }
    });
}
