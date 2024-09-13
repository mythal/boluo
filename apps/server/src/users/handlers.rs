use super::api::{Login, LoginReturn, Register, ResetPassword, ResetPasswordConfirm, ResetPasswordTokenCheck};
use super::models::User;
use crate::channels::Channel;
use crate::error::{AppError, Find, ValidationFailed};
use crate::interface;
use crate::interface::{missing, ok_response, parse_body, parse_query};
use crate::media::{upload, upload_params};
use crate::session::{
    add_session_cookie, add_settings_cookie, get_session_from_old_version_cookies, is_authenticate_use_cookie,
    remove_session, remove_session_cookie, revoke_session,
};
use crate::spaces::Space;
use crate::users::api::{CheckEmailExists, CheckUsernameExists, EditUser, GetMe, QueryUser};
use crate::users::models::UserExt;
use crate::utils::{get_ip, id};
use crate::{cache, db, mail};
use deadpool_redis::redis::AsyncCommands;
use hyper::body::{Body, Incoming};
use hyper::{Method, Request, Response};

async fn register(req: Request<impl Body>) -> Result<User, AppError> {
    let Register {
        email,
        username,
        nickname,
        password,
    }: Register = interface::parse_body(req).await?;
    let pool = db::get().await;
    let user = User::register(&pool, &email, &username, &nickname, &password).await?;
    log::info!("{} ({}) was registered.", user.username, user.email);
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
            Ok(Some(User::get_by_id(&pool, &session.user_id).await.or_not_found()?))
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
    let settings = UserExt::get_settings(&pool, session.user_id).await?;
    Ok(settings)
}

pub async fn get_me(req: Request<impl Body>) -> Result<Response<Vec<u8>>, AppError> {
    use crate::session::authenticate;
    let mut session = authenticate(&req).await;
    if let Err(AppError::Unauthenticated(_)) = session {
        let maybe_session = get_session_from_old_version_cookies(req.headers()).await;
        if let Some(some_session) = maybe_session {
            session = Ok(some_session);
        }
    }

    match session {
        Ok(session) => {
            let pool = db::get().await;
            let mut conn = pool.acquire().await?;
            let user = User::get_by_id(&mut *conn, &session.user_id).await?;
            if let Some(user) = user {
                let my_spaces = Space::get_by_user(&mut *conn, &user.id).await?;
                let my_channels = Channel::get_by_user(&mut *conn, user.id).await?;
                let settings = UserExt::get_settings(&mut *conn, user.id).await?;

                let mut response = ok_response(Some(GetMe {
                    user,
                    settings,
                    my_channels,
                    my_spaces,
                }));
                if is_authenticate_use_cookie(req.headers()) {
                    // refresh session cookie
                    let is_debug = req.headers().get("X-Debug").is_some();
                    add_session_cookie(&session.id, is_debug, response.headers_mut())
                }
                Ok(response)
            } else {
                remove_session(session.id).await?;
                log::error!(
                    "[Unexpected] session ({}) is valid and exists, \
                    but the user ({}) to whom the session refers \
                    cannot be found in the database.",
                    session.id,
                    session.user_id
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

    let is_debug = req.headers().get("X-Debug").is_some();
    let form: Login = interface::parse_body(req).await?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let user = User::login(&mut *conn, &form.username, &form.password)
        .await
        .or_no_permission()?;
    let session = session::start(&user.id).await.map_err(error_unexpected!())?;
    let token = session::token(&session);
    let token = if form.with_token { Some(token) } else { None };
    let my_spaces = Space::get_by_user(&mut *conn, &user.id).await?;
    let my_channels = Channel::get_by_user(&mut *conn, user.id).await?;
    let settings = UserExt::get_settings(&mut *conn, user.id).await?;
    let me = GetMe {
        user,
        settings: settings.clone(),
        my_spaces,
        my_channels,
    };
    let mut response = ok_response(LoginReturn { me, token });
    let headers = response.headers_mut();
    add_session_cookie(&session, is_debug, headers);
    add_settings_cookie(&settings, headers);
    Ok(response)
}

pub async fn logout(req: Request<impl Body>) -> Result<Response<Vec<u8>>, AppError> {
    use crate::session::authenticate;

    if let Ok(session) = authenticate(&req).await {
        revoke_session(&session.id).await?;
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
    User::edit(&pool, &session.user_id, nickname, bio, avatar, default_color)
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
    UserExt::update_settings(&pool, session.user_id, settings)
        .await
        .map_err(Into::into)
}

pub async fn partial_update_settings(req: Request<impl Body>) -> Result<serde_json::Value, AppError> {
    use crate::csrf::authenticate;
    let session = authenticate(&req).await?;
    let settings: serde_json::Value = parse_body(req).await?;
    let pool = db::get().await;
    UserExt::partial_update_settings(&pool, session.user_id, settings)
        .await
        .map_err(Into::into)
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
    User::edit(&mut *conn, &session.user_id, None, None, Some(media.id), None)
        .await
        .map_err(Into::into)
}

pub async fn remove_avatar(req: Request<impl Body>) -> Result<User, AppError> {
    use crate::csrf::authenticate;
    let session = authenticate(&req).await?;

    let pool = db::get().await;
    User::remove_avatar(&pool, &session.user_id).await.map_err(Into::into)
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

pub async fn ip_limit(cache: &mut deadpool_redis::Connection, req: &Request<impl Body>) -> Result<(), AppError> {
    let ip = get_ip(req).unwrap_or_else(|| {
        log::warn!("Unable to obtain client IP");
        log::info!("{:?}", req.headers());
        "0.0.0.0"
    });
    let mut key = b"reset_password_ip:".to_vec();
    key.extend_from_slice(ip.as_bytes());
    let counter: i32 = cache.incr(&key, 1).await?;
    if counter == 1 {
        cache.expire::<_, ()>(&key, 60 * 2).await?;
    }
    if counter > 3 {
        return Err(AppError::LimitExceeded("IP"));
    }
    Ok(())
}

pub async fn email_limit(cache: &mut deadpool_redis::Connection, email: &str) -> Result<(), AppError> {
    let email_key = token_key(email);
    let counter: i32 = cache.incr(&email_key, 1).await?;
    if counter == 1 {
        cache.expire::<_, ()>(&email_key, 60 * 2).await?;
    }
    if counter > 2 {
        return Err(AppError::LimitExceeded("email"));
    }
    Ok(())
}

pub async fn reset_password(req: Request<impl Body>) -> Result<(), AppError> {
    let mut cache = cache::conn().await;
    ip_limit(&mut cache, &req).await?;
    let ResetPassword { email, lang } = parse_body(req).await?;
    email_limit(&mut cache, &email).await?;

    let pool = db::get().await;
    User::get_by_email(&pool, &email)
        .await?
        .ok_or(AppError::NotFound("email"))?;
    let token = uuid::Uuid::new_v4().to_string();
    let key = token_key(&token);

    cache
        .set_ex::<_, _, ()>(key.as_slice(), email.as_bytes(), 60 * 60)
        .await?;
    let lang = lang.as_deref().unwrap_or("en");
    match lang {
        "zh" | "zh-CN" | "zh_CN" => {
            mail::send(
                &email,
                include_str!("../../text/reset-password/title.zh-CN.txt").trim(),
                &format!(include_str!("../../text/reset-password/content.zh-CN.html"), token),
            )
            .await
        }
        "zh-TW" | "zh_TW" => {
            mail::send(
                &email,
                include_str!("../../text/reset-password/title.zh-TW.txt").trim(),
                &format!(include_str!("../../text/reset-password/content.zh-TW.html"), token),
            ).await
        }
        "ja" => {
            mail::send(
                &email,
                include_str!("../../text/reset-password/title.ja.txt").trim(),
                &format!(include_str!("../../text/reset-password/content.ja.html"), token),
            )
            .await
        }
        _ => {
            mail::send(
                &email,
                include_str!("../../text/reset-password/title.en.txt").trim(),
                &format!(include_str!("../../text/reset-password/content.en.html"), token),
            )
            .await
        }
    }
    .map_err(AppError::Unexpected)?;
    Ok(())
}

pub async fn reset_password_token_check(req: Request<impl Body>) -> Result<bool, AppError> {
    let ResetPasswordTokenCheck { token } = parse_query(req.uri())?;
    let email = cache::conn()
        .await
        .get::<_, Option<Vec<u8>>>(token_key(&token).as_slice())
        .await?
        .map(String::from_utf8);
    if let Some(Ok(_)) = email {
        Ok(true)
    } else {
        Ok(false)
    }
}

pub async fn reset_password_confirm(req: Request<impl Body>) -> Result<(), AppError> {
    let ResetPasswordConfirm { token, password } = parse_body(req).await?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let email = cache::conn()
        .await
        .get::<_, Option<Vec<u8>>>(token_key(&token).as_slice())
        .await?
        .map(String::from_utf8)
        .ok_or(AppError::NotFound("token"))?
        .map_err(|e| AppError::Unexpected(e.into()))?;
    let user = User::get_by_email(&mut *conn, &email)
        .await?
        .ok_or(AppError::NotFound("user"))?;
    User::reset_password(&mut *conn, user.id, &password).await?;
    Ok(())
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
        ("/reset_password_token_check", Method::GET) => reset_password_token_check(req).await.map(ok_response),
        ("/reset_password_confirm", Method::POST) => reset_password_confirm(req).await.map(ok_response),
        _ => missing(),
    }
}
