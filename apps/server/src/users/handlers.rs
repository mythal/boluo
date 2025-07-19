use std::net::IpAddr;
use std::sync::LazyLock;

use super::api::{
    Login, LoginReturn, Register, ResetPassword, ResetPasswordConfirm, ResetPasswordTokenCheck,
};
use super::models::User;
use crate::cache::CACHE;
use crate::channels::Channel;
use crate::context::get_site_url;
use crate::error::{AppError, Find, ValidationFailed};
use crate::interface;
use crate::interface::{missing, ok_response, parse_body, parse_query};
use crate::media::{upload, upload_params};
use crate::session::{
    add_session_cookie, add_settings_cookie, remove_session_cookie, revoke_session,
};
use crate::spaces::Space;
use crate::ttl::{Lifespan, Mortal, minute};
use crate::users::api::{
    CheckEmailExists, CheckUsernameExists, EditUser, EmailVerificationStatus, GetMe, QueryUser,
    ResendEmailVerificationResult,
};
use crate::users::models::UserExt;
use crate::utils::{get_ip, id};
use crate::{db, mail};
use hyper::body::{Body, Incoming};
use hyper::{Method, Request, Response};
use uuid::Uuid;

async fn register(req: Request<impl Body>) -> Result<User, AppError> {
    let Register {
        email,
        username,
        nickname,
        password,
    }: Register = interface::parse_body(req).await?;
    let pool = db::get().await;
    let user = User::register(&pool, &email, &username, &nickname, &password).await?;

    // Send email verification
    send_email_verification(&user.email, &user.id, None).await?;

    tracing::info!(
        username = %user.username,
        email = %user.email,
        id = %user.id,
        "A new user was registered and verification email sent"
    );
    Ok(user)
}

pub async fn query_user(req: Request<impl Body>) -> Result<Option<User>, AppError> {
    use crate::session::authenticate;

    let QueryUser { id } = parse_query(req.uri())?;

    let id = if let Some(id) = id {
        id
    } else {
        match authenticate(&req).await {
            Ok(session) => session.user_id,
            Err(AppError::Unauthenticated(_)) => return Ok(None),
            Err(e) => return Err(e),
        }
    };

    let pool = db::get().await;
    User::get_by_id(&pool, &id).await.or_not_found().map(Some)
}

pub async fn query_self(req: Request<impl Body>) -> Result<Option<User>, AppError> {
    use crate::session::authenticate;

    let session = authenticate(&req).await;
    match session {
        Ok(session) => {
            let pool = db::get().await;
            Ok(Some(
                User::get_by_id(&pool, &session.user_id)
                    .await
                    .or_not_found()?,
            ))
        }
        Err(AppError::Unauthenticated(_)) => Ok(None),
        Err(e) => Err(e),
    }
}

pub async fn query_settings(req: Request<impl Body>) -> Result<serde_json::Value, AppError> {
    use crate::session::authenticate;
    let Ok(session) = authenticate(&req).await else {
        return Ok(serde_json::json!({}));
    };

    let pool = db::get().await;
    let user_ext = UserExt::get(&pool, session.user_id).await;
    Ok(user_ext
        .map(|ext| ext.settings)
        .unwrap_or(serde_json::json!({})))
}

impl Lifespan for GetMe {
    fn ttl_sec() -> u64 {
        minute::ONE
    }
}

pub async fn get_me(req: Request<impl Body>) -> Result<Response<Vec<u8>>, AppError> {
    use crate::session::authenticate;
    let session = authenticate(&req).await;

    match session {
        Ok(session) => {
            let pool = db::get().await;
            let mut conn = pool.acquire().await?;
            let user = User::get_by_id(&mut *conn, &session.user_id).await?;
            if let Some(user) = user {
                let cached = CACHE.GetMe.get(&user.id);
                if let Some(get_me) = cached.and_then(Mortal::fresh_only) {
                    return Ok(ok_response(Some(get_me)));
                }
                let my_spaces = Space::get_by_user(&mut conn, user.id).await?;
                let my_channels = Channel::get_by_user(&mut conn, user.id).await?;
                let user_ext = UserExt::get(&mut *conn, user.id).await.ok();
                let get_me = GetMe {
                    user,
                    settings: user_ext
                        .map(|ext| ext.settings)
                        .unwrap_or(serde_json::json!({})),
                    my_channels,
                    my_spaces,
                };

                Ok(ok_response(Some(get_me)))
            } else {
                revoke_session(session.id).await?;
                tracing::error!(
                    user_id = %session.user_id,
                    session_id = %session.id,
                    "The user has a valid session, but the user cannot be found in the database"
                );
                let mut response = ok_response::<Option<GetMe>>(None);
                remove_session_cookie(response.headers_mut());
                Ok(response)
            }
        }
        Err(AppError::Unauthenticated(_)) => Ok(ok_response::<Option<GetMe>>(None)),
        Err(e) => Err(e),
    }
}

pub async fn login<B: Body>(req: Request<B>) -> Result<Response<Vec<u8>>, AppError> {
    use crate::session;
    let origin = req
        .headers()
        .get(hyper::header::ORIGIN)
        .and_then(|x| x.to_str().ok())
        .map(|s| s.to_string());
    let is_debug = req.headers().get("X-Debug").is_some();
    let form: Login = interface::parse_body(req).await?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let user = User::login(&mut *conn, &form.username, &form.password)
        .await
        .inspect_err(
            |err| tracing::warn!(error = %err, username = %form.username, "Failed to login, password may be incorrect"),
        )
        .inspect(|user| {
            if let Some(user) = user {
                tracing::info!(
                    id = %user.id,
                    username = %user.username,
                    email = %user.email,
                    "A user logged in"
                );
            } else {
                tracing::warn!(
                    username = %form.username,
                    "Failed to login, username may be incorrect"
                );
            }
        })
        .or_no_permission()?;
    let user_id = user.id;
    let session = session::start(user_id).await?;
    let token: String = session::token(&session.id);
    let token = if form.with_token { Some(token) } else { None };
    let my_spaces = Space::get_by_user(&mut conn, user_id).await?;
    let my_channels = Channel::get_by_user(&mut conn, user_id).await?;
    let user_ext = UserExt::get(&mut *conn, user_id).await;
    let settings = user_ext
        .map(|ext| ext.settings)
        .unwrap_or(serde_json::json!({}));
    let me = GetMe {
        user,
        settings: settings.clone(),
        my_spaces,
        my_channels,
    };
    CACHE.GetMe.insert(user_id, me.clone().into());
    let mut response = ok_response(LoginReturn { me, token });
    let headers = response.headers_mut();
    add_settings_cookie(&settings, headers);
    if !form.with_token {
        add_session_cookie(origin.as_deref(), &session.id, is_debug, headers);
    }
    Ok(response)
}

pub async fn logout(req: Request<impl Body>) -> Result<Response<Vec<u8>>, AppError> {
    use crate::session::authenticate;

    if let Ok(session) = authenticate(&req).await {
        revoke_session(session.id).await?;
    }
    let mut response = ok_response(true);
    remove_session_cookie(response.headers_mut());
    Ok(response)
}

pub async fn edit(req: Request<impl Body>) -> Result<User, AppError> {
    use crate::csrf::authenticate;
    let session = authenticate(&req).await?;
    let EditUser {
        nickname,
        bio,
        avatar,
        default_color,
    }: EditUser = parse_body(req).await?;
    let pool = db::get().await;
    User::edit(
        &pool,
        &session.user_id,
        nickname,
        bio,
        avatar,
        default_color,
    )
    .await
    .map_err(Into::into)
}

pub fn is_image(mime: &Option<String>) -> bool {
    if let Some(mime) = mime {
        if mime == r"image/png" || mime == r"image/gif" || mime == r"image/jpeg" {
            return true;
        }
    }
    false
}

pub async fn update_settings(req: Request<impl Body>) -> Result<serde_json::Value, AppError> {
    use crate::csrf::authenticate;
    let session = authenticate(&req).await?;
    let settings: serde_json::Value = parse_body(req).await?;
    let pool = db::get().await;
    let user_ext = UserExt::update_settings(&pool, session.user_id, settings).await?;
    Ok(user_ext.settings)
}

pub async fn partial_update_settings(
    req: Request<impl Body>,
) -> Result<serde_json::Value, AppError> {
    use crate::csrf::authenticate;
    let session = authenticate(&req).await?;
    let settings: serde_json::Value = parse_body(req).await?;
    let pool = db::get().await;
    let user_ext = UserExt::partial_update_settings(&pool, session.user_id, settings).await?;
    Ok(user_ext.settings)
}

pub async fn edit_avatar(req: Request<Incoming>) -> Result<User, AppError> {
    use crate::csrf::authenticate;
    let session = authenticate(&req).await?;
    let params = upload_params(req.uri())?;
    if !is_image(&params.mime_type) {
        return Err(ValidationFailed("Incorrect File Format").into());
    }
    let media_id = id();
    let media = upload(req, media_id, params, 1024 * 1024).await?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let media = media.create(&mut *conn, session.user_id, "avatar").await?;
    User::edit(
        &mut *conn,
        &session.user_id,
        None,
        None,
        Some(media.id),
        None,
    )
    .await
    .map_err(Into::into)
}

pub async fn remove_avatar(req: Request<impl Body>) -> Result<User, AppError> {
    use crate::csrf::authenticate;
    let session = authenticate(&req).await?;

    let pool = db::get().await;
    User::remove_avatar(&pool, &session.user_id)
        .await
        .map_err(Into::into)
}

pub async fn check_email_exists(req: Request<impl Body>) -> Result<bool, AppError> {
    let CheckEmailExists { email } = parse_query(req.uri())?;
    let pool = db::get().await;
    let user = User::get_by_email(&pool, &email).await?;
    Ok(user.is_some())
}

pub async fn check_username_exists(req: Request<impl Body>) -> Result<bool, AppError> {
    let CheckUsernameExists { username } = parse_query(req.uri())?;
    let pool = db::get().await;
    let user = User::get_by_username(&pool, &username).await?;
    Ok(user.is_some())
}

pub fn token_key(token: &str) -> Vec<u8> {
    let mut key = b"reset_password:".to_vec();
    key.extend_from_slice(token.as_bytes());
    key
}

pub async fn reset_password(req: Request<impl Body>) -> Result<(), AppError> {
    use governor::{DefaultKeyedRateLimiter, Quota, RateLimiter};
    static IP_LIMITER: LazyLock<DefaultKeyedRateLimiter<IpAddr>> = LazyLock::new(|| {
        RateLimiter::keyed(Quota::per_hour(std::num::NonZeroU32::new(32).unwrap()))
    });
    let ip = get_ip(&req)?;
    IP_LIMITER
        .check_key(&ip)
        .map_err(|_| AppError::LimitExceeded("Too many requests, please try again later."))?;

    let ResetPassword { email, lang } = parse_body(req).await?;
    let email = email.trim().to_lowercase();
    crate::validators::EMAIL.run(&email)?;

    static EMAIL_LIMITER: LazyLock<DefaultKeyedRateLimiter<String>> = LazyLock::new(|| {
        RateLimiter::keyed(Quota::per_hour(std::num::NonZeroU32::new(16).unwrap()))
    });
    EMAIL_LIMITER
        .check_key(&email)
        .map_err(|_| AppError::LimitExceeded("This email is requested too many times."))?;

    let mut conn = db::get().await.acquire().await?;
    let user = User::get_by_email(&mut *conn, &email)
        .await?
        .ok_or(AppError::NotFound("email"))?;
    let token = User::generate_reset_token(&mut *conn, user.id)
        .await?
        .to_string();

    let site_url = get_site_url()?;

    let lang = lang.as_deref().unwrap_or("en");
    match lang {
        "zh" | "zh-CN" | "zh_CN" => {
            mail::send(
                &email,
                include_str!("../../text/reset-password/title.zh-CN.txt").trim(),
                &format!(
                    include_str!("../../text/reset-password/content.zh-CN.html"),
                    site_url, token
                ),
            )
            .await
        }
        "zh-TW" | "zh_TW" => {
            mail::send(
                &email,
                include_str!("../../text/reset-password/title.zh-TW.txt").trim(),
                &format!(
                    include_str!("../../text/reset-password/content.zh-TW.html"),
                    site_url, token
                ),
            )
            .await
        }
        "ja" => {
            mail::send(
                &email,
                include_str!("../../text/reset-password/title.ja.txt").trim(),
                &format!(
                    include_str!("../../text/reset-password/content.ja.html"),
                    site_url, token
                ),
            )
            .await
        }
        _ => {
            mail::send(
                &email,
                include_str!("../../text/reset-password/title.en.txt").trim(),
                &format!(
                    include_str!("../../text/reset-password/content.en.html"),
                    site_url, token
                ),
            )
            .await
        }
    }
    .map_err(AppError::Unexpected)?;
    Ok(())
}

pub async fn reset_password_token_check(req: Request<impl Body>) -> Result<bool, AppError> {
    let ResetPasswordTokenCheck { token } = parse_query(req.uri())?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let token = token
        .parse::<Uuid>()
        .map_err(|_| AppError::BadRequest("Invalid token".to_string()))?;
    Ok(User::get_by_reset_token(&mut *conn, token).await.is_ok())
}

pub async fn reset_password_confirm(req: Request<impl Body>) -> Result<(), AppError> {
    let ResetPasswordConfirm { token, password } = parse_body(req).await?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let token = token
        .parse::<Uuid>()
        .map_err(|_| AppError::BadRequest("Invalid token".to_string()))?;
    let user = User::get_by_reset_token(&mut *conn, token).await?;
    User::reset_password(&mut conn, user.id, token, &password).await?;
    Ok(())
}

async fn send_email_verification(
    email: &str,
    user_id: &Uuid,
    lang: Option<&str>,
) -> Result<(), AppError> {
    let token = User::generate_email_verification_token(user_id);
    let lang = lang.unwrap_or("en");

    let site_url = get_site_url()?;

    match lang {
        "zh" | "zh-CN" | "zh_CN" => {
            mail::send(
                email,
                include_str!("../../text/email-verification/title.zh-CN.txt").trim(),
                &format!(
                    include_str!("../../text/email-verification/content.zh-CN.html"),
                    site_url, token
                ),
            )
            .await
        }
        "zh-TW" | "zh_TW" => {
            mail::send(
                email,
                include_str!("../../text/email-verification/title.zh-TW.txt").trim(),
                &format!(
                    include_str!("../../text/email-verification/content.zh-TW.html"),
                    site_url, token
                ),
            )
            .await
        }
        "ja" => {
            mail::send(
                email,
                include_str!("../../text/email-verification/title.ja.txt").trim(),
                &format!(
                    include_str!("../../text/email-verification/content.ja.html"),
                    site_url, token
                ),
            )
            .await
        }
        _ => {
            mail::send(
                email,
                include_str!("../../text/email-verification/title.en.txt").trim(),
                &format!(
                    include_str!("../../text/email-verification/content.en.html"),
                    site_url, token
                ),
            )
            .await
        }
    }
    .map_err(AppError::Unexpected)?;
    Ok(())
}

pub async fn verify_email(req: Request<impl Body>) -> Result<(), AppError> {
    use crate::users::api::VerifyEmail;
    let VerifyEmail { token } = parse_query(req.uri())?;

    let user_id = User::verify_email_verification_token(&token)
        .map_err(|e| AppError::BadRequest(format!("Invalid verification token: {}", e)))?;

    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    User::verify_email(&mut *conn, &user_id).await?;

    tracing::info!(
        user_id = %user_id,
        "User email verified successfully"
    );

    Ok(())
}

pub async fn resend_email_verification(
    req: Request<impl Body>,
) -> Result<ResendEmailVerificationResult, AppError> {
    use crate::session::authenticate;
    use crate::users::api::ResendEmailVerification;

    let session = authenticate(&req).await?;
    let ResendEmailVerification { lang } = parse_body(req).await?;

    let pool = db::get().await;
    let user = User::get_by_id(&pool, &session.user_id)
        .await
        .or_not_found()?;

    // Check if email is already verified
    let is_verified = UserExt::is_email_verified(&pool, session.user_id).await?;
    if is_verified {
        return Ok(ResendEmailVerificationResult::AlreadyVerified);
    }

    tracing::debug!(
        user_id = %user.id,
        email = %user.email,
        "Resending email verification"
    );
    send_email_verification(&user.email, &user.id, lang.as_deref()).await?;

    tracing::info!(
        user_id = %user.id,
        email = %user.email,
        "Resent email verification"
    );

    Ok(ResendEmailVerificationResult::Sent)
}

pub async fn check_email_verification_status(
    req: Request<impl Body>,
) -> Result<EmailVerificationStatus, AppError> {
    use crate::session::authenticate;

    let session = authenticate(&req).await?;
    let pool = db::get().await;
    let is_verified = UserExt::is_email_verified(&pool, session.user_id).await?;

    Ok(EmailVerificationStatus { is_verified })
}

async fn send_email_change_verification(
    new_email: &str,
    user_id: &Uuid,
    lang: Option<&str>,
) -> Result<(), AppError> {
    let token = User::generate_email_change_token(user_id, new_email);
    let lang = lang.unwrap_or("en");

    let site_url = get_site_url()?;

    match lang {
        "zh" | "zh-CN" | "zh_CN" => {
            mail::send(
                new_email,
                include_str!("../../text/email-change/title.zh-CN.txt").trim(),
                &format!(
                    include_str!("../../text/email-change/content.zh-CN.html"),
                    site_url, token
                ),
            )
            .await
        }
        "zh-TW" | "zh_TW" => {
            mail::send(
                new_email,
                include_str!("../../text/email-change/title.zh-TW.txt").trim(),
                &format!(
                    include_str!("../../text/email-change/content.zh-TW.html"),
                    site_url, token
                ),
            )
            .await
        }
        "ja" => {
            mail::send(
                new_email,
                include_str!("../../text/email-change/title.ja.txt").trim(),
                &format!(
                    include_str!("../../text/email-change/content.ja.html"),
                    site_url, token
                ),
            )
            .await
        }
        _ => {
            mail::send(
                new_email,
                include_str!("../../text/email-change/title.en.txt").trim(),
                &format!(
                    include_str!("../../text/email-change/content.en.html"),
                    site_url, token
                ),
            )
            .await
        }
    }
    .map_err(AppError::Unexpected)?;
    Ok(())
}

pub async fn request_email_change(req: Request<impl Body>) -> Result<(), AppError> {
    use crate::session::authenticate;
    use crate::users::api::RequestEmailChange;
    use governor::{DefaultKeyedRateLimiter, Quota, RateLimiter};
    use std::net::IpAddr;

    static IP_LIMITER: LazyLock<DefaultKeyedRateLimiter<IpAddr>> = LazyLock::new(|| {
        RateLimiter::keyed(Quota::per_hour(std::num::NonZeroU32::new(10).unwrap()))
    });
    let ip = get_ip(&req)?;
    IP_LIMITER
        .check_key(&ip)
        .map_err(|_| AppError::LimitExceeded("Too many requests, please try again later."))?;

    let session = authenticate(&req).await?;
    let RequestEmailChange { new_email, lang } = parse_body(req).await?;

    let new_email = new_email.trim().to_lowercase();
    crate::validators::EMAIL.run(&new_email)?;

    static EMAIL_LIMITER: LazyLock<DefaultKeyedRateLimiter<String>> = LazyLock::new(|| {
        RateLimiter::keyed(Quota::per_hour(std::num::NonZeroU32::new(5).unwrap()))
    });
    EMAIL_LIMITER
        .check_key(&new_email)
        .map_err(|_| AppError::LimitExceeded("This email is requested too many times."))?;

    let pool = db::get().await;
    let mut conn = pool.acquire().await?;

    let current_user = User::get_by_id(&mut *conn, &session.user_id)
        .await
        .or_not_found()?;

    if current_user.email == new_email {
        return Err(AppError::BadRequest(
            "New email is the same as current email".to_string(),
        ));
    }

    if User::get_by_email(&mut *conn, &new_email).await?.is_some() {
        return Err(AppError::Conflict(
            "Email address is already in use".to_string(),
        ));
    }

    send_email_change_verification(&new_email, &session.user_id, lang.as_deref()).await?;

    tracing::info!(
        user_id = %session.user_id,
        current_email = %current_user.email,
        new_email = %new_email,
        "Email change verification sent"
    );

    Ok(())
}

pub async fn confirm_email_change(req: Request<impl Body>) -> Result<User, AppError> {
    use crate::users::api::ConfirmEmailChange;

    let ConfirmEmailChange { token } = parse_body(req).await?;

    let (user_id, new_email) = User::verify_email_change_token(&token)
        .map_err(|e| AppError::BadRequest(format!("Invalid email change token: {}", e)))?;

    let pool = db::get().await;
    let mut conn = pool.acquire().await?;

    let current_user = User::get_by_id(&mut *conn, &user_id).await.or_not_found()?;

    let updated_user = User::change_email(&mut *conn, &user_id, &new_email).await?;

    // Mark the new email as verified since user confirmed the change via email
    User::mark_email_verified(&mut *conn, &user_id).await?;

    CACHE.User.insert(user_id, updated_user.clone().into());

    tracing::info!(
        user_id = %user_id,
        old_email = %current_user.email,
        new_email = %new_email,
        "User email changed successfully"
    );

    Ok(updated_user)
}

/// https://meta.discourse.org/t/setup-discourseconnect-official-single-sign-on-for-discourse-sso/13045
pub async fn discourse_login(req: Request<impl Body>) -> Result<Response<Vec<u8>>, AppError> {
    use super::api::{DiscourseConnect, DiscoursePayload, DiscourseResponse};
    use crate::context::media_public_url;
    use crate::session::authenticate;

    let current_url = req.uri().to_string();
    use base64::{Engine as _, engine::general_purpose::STANDARD as base64_engine};
    use ring::hmac;

    // Parse the SSO request
    let DiscourseConnect { sso, sig } = parse_query(req.uri())?;

    tracing::info!("Starting DiscourseConnect SSO authentication");

    // Get the SSO secret from environment
    static DISCOURSE_SSO_SECRET: LazyLock<Option<String>> =
        LazyLock::new(|| std::env::var("DISCOURSE_SSO_SECRET").ok());
    let sso_secret = DISCOURSE_SSO_SECRET.as_ref().ok_or(AppError::BadRequest(
        "DISCOURSE_SSO_SECRET not configured".to_string(),
    ))?;

    // Verify the signature
    let key = hmac::Key::new(hmac::HMAC_SHA256, sso_secret.as_bytes());
    let expected_sig = hex::encode(hmac::sign(&key, sso.as_bytes()).as_ref());
    if sig != expected_sig {
        return Err(AppError::BadRequest("Invalid signature".to_string()));
    }

    // Decode the SSO payload
    let payload_bytes = base64_engine
        .decode(&sso)
        .map_err(|_| AppError::BadRequest("Invalid base64 payload".to_string()))?;
    let payload_str = String::from_utf8(payload_bytes)
        .map_err(|_| AppError::BadRequest("Invalid UTF-8 payload".to_string()))?;

    // Parse the payload parameters
    let payload: DiscoursePayload = serde_urlencoded::from_str(&payload_str)
        .map_err(|_| AppError::BadRequest("Invalid payload format".to_string()))?;

    let site_url = get_site_url()?;

    // Authenticate the user
    let session = match authenticate(&req).await {
        Ok(session) => session,
        Err(AppError::Unauthenticated(_)) => {
            // User not authenticated, redirect to login with next parameter

            // Encode the current request URL as the next parameter
            use crate::utils::url_percent_encode;
            let encoded_next = url_percent_encode(&current_url);
            let login_url = format!("{site_url}/account/login",);
            let redirect_url = format!("{}?next={}", login_url, encoded_next);

            tracing::info!(
                redirect_url = %redirect_url,
                "Redirecting unauthenticated user to login"
            );

            return hyper::Response::builder()
                .status(hyper::StatusCode::FOUND)
                .header(hyper::header::LOCATION, redirect_url)
                .body(Vec::new())
                .map_err(|e| AppError::Unexpected(e.into()));
        }
        Err(e) => return Err(e),
    };

    // Get user data
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let user = User::get_by_id(&mut *conn, &session.user_id)
        .await
        .or_not_found()?;
    let email_verified: bool = UserExt::is_email_verified(&mut *conn, user.id).await?;

    if !email_verified {
        use crate::utils::url_percent_encode;
        let encoded_next = url_percent_encode(&current_url);
        let redirect_url = format!(
            "{site_url}/account/verify-email?source=forum_login&next={}",
            encoded_next
        );

        tracing::info!(
            user_id = %user.id,
            redirect_url = %redirect_url,
            "Redirecting unverified user to verify email"
        );

        return hyper::Response::builder()
            .status(hyper::StatusCode::FOUND)
            .header(hyper::header::LOCATION, redirect_url)
            .body(Vec::new())
            .map_err(|e| AppError::Unexpected(e.into()));
    }

    tracing::info!(
        user_id = %user.id,
        username = %user.username,
        "User authenticated for DiscourseConnect SSO"
    );

    // Build avatar URL if user has avatar
    let avatar_url = user
        .avatar_id
        .map(|avatar_id| format!("{}/{}", media_public_url().trim_end_matches('/'), avatar_id));

    // Create response payload
    let response_data = DiscourseResponse {
        nonce: payload.nonce,
        external_id: user.id.to_string(),
        email: user.email,
        username: user.username,
        name: user.nickname,
        require_activation: false,
        bio: if user.bio.is_empty() {
            None
        } else {
            Some(user.bio)
        },
        avatar_url,
    };

    // Encode the response
    let response_payload = serde_urlencoded::to_string(&response_data)
        .map_err(|_| AppError::BadRequest("Failed to encode response".to_string()))?;
    let response_base64 = base64_engine.encode(&response_payload);

    // Sign the response
    let response_sig = hex::encode(hmac::sign(&key, response_base64.as_bytes()).as_ref());

    // Build the redirect URL
    use percent_encoding::{AsciiSet, CONTROLS, utf8_percent_encode};
    const FRAGMENT: &AsciiSet = &CONTROLS.add(b' ').add(b'"').add(b'<').add(b'>').add(b'`');

    let encoded_sso = utf8_percent_encode(&response_base64, FRAGMENT).to_string();
    let redirect_url = format!(
        "{}?sso={}&sig={}",
        payload.return_sso_url, encoded_sso, response_sig
    );

    tracing::info!(
        redirect_url = %redirect_url,
        "Redirecting user back to Discourse"
    );

    // Return redirect response
    hyper::Response::builder()
        .status(hyper::StatusCode::FOUND)
        .header(hyper::header::LOCATION, redirect_url)
        .body(Vec::new())
        .map_err(|e| AppError::Unexpected(e.into()))
}

pub async fn router(req: Request<Incoming>, path: &str) -> Result<Response<Vec<u8>>, AppError> {
    match (path, req.method().clone()) {
        ("/login", Method::POST) => login(req).await,
        ("/register", Method::POST) => register(req).await.map(ok_response),
        ("/logout", _) => logout(req).await,
        ("/query", Method::GET) => query_user(req).await.map(ok_response),
        ("/query_self", Method::GET) => query_self(req).await.map(ok_response),
        ("/get_me", Method::GET) => get_me(req).await,
        ("/settings", Method::GET) => query_settings(req).await.map(ok_response),
        ("/edit", Method::POST) => edit(req).await.map(ok_response),
        ("/edit_avatar", Method::POST) => edit_avatar(req).await.map(ok_response),
        ("/remove_avatar", Method::POST) => remove_avatar(req).await.map(ok_response),
        ("/update_settings", Method::POST) => update_settings(req).await.map(ok_response),
        ("/update_settings", Method::PUT) => update_settings(req).await.map(ok_response),
        ("/update_settings", Method::PATCH) => partial_update_settings(req).await.map(ok_response),
        ("/check_username", Method::GET) => check_username_exists(req).await.map(ok_response),
        ("/check_email", Method::GET) => check_email_exists(req).await.map(ok_response),
        ("/reset_password", Method::POST) => reset_password(req).await.map(ok_response),
        ("/reset_password_token_check", Method::GET) => {
            reset_password_token_check(req).await.map(ok_response)
        }
        ("/reset_password_confirm", Method::POST) => {
            reset_password_confirm(req).await.map(ok_response)
        }
        ("/discourse/start", Method::GET) => discourse_login(req).await,
        ("/discourse/start", Method::POST) => discourse_login(req).await,
        ("/verify_email", Method::GET) => verify_email(req).await.map(ok_response),
        ("/resend_email_verification", Method::POST) => {
            resend_email_verification(req).await.map(ok_response)
        }
        ("/email_verification_status", Method::GET) => {
            check_email_verification_status(req).await.map(ok_response)
        }
        ("/request_email_change", Method::POST) => request_email_change(req).await.map(ok_response),
        ("/confirm_email_change", Method::POST) => confirm_email_change(req).await.map(ok_response),
        _ => missing(),
    }
}
