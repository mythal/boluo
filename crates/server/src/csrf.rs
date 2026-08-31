use crate::error::AppError;
use crate::session::{self, AuthenticateFail, Session};
use hyper::Request;
use hyper::body::Body;
use time::OffsetDateTime;
use uuid::Uuid;

// csrf-token:[session key(base 64)].[timestamp].[signature]

pub async fn authenticate(
    ctx: &crate::context::AppContext,
    req: &Request<impl Body>,
) -> Result<Session, AppError> {
    let session = session::authenticate(ctx, req).await?;
    Ok(session)
}

pub async fn authenticate_optional(
    ctx: &crate::context::AppContext,
    req: &Request<impl Body>,
) -> Result<Option<Session>, AppError> {
    let session = session::authenticate(ctx, req).await;
    match session {
        Ok(session) => Ok(Some(session)),
        Err(AppError::Unauthenticated(AuthenticateFail::Guest)) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn generate_csrf_token(signer: &crate::context::Signer, session_key: &Uuid) -> String {
    use base64::{Engine as _, engine::general_purpose::STANDARD_NO_PAD as base64_engine};

    let expire_sec = 60 * 60 * 3;
    let timestamp: i64 = OffsetDateTime::now_utc().unix_timestamp() + expire_sec;
    let mut buffer = String::with_capacity(128);
    base64_engine.encode_string(session_key.as_bytes(), &mut buffer);
    buffer.push('.');
    buffer.push_str(&timestamp.to_string());
    let signature = signer.sign(&buffer);
    buffer.push('.');
    base64_engine.encode_string(signature, &mut buffer);
    buffer
}

pub async fn get_csrf_token(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<String, AppError> {
    let session_id = if let Ok(session) = session::authenticate(ctx, &req).await {
        session.id
    } else {
        Uuid::nil()
    };

    Ok(generate_csrf_token(ctx.signer(), &session_id))
}
