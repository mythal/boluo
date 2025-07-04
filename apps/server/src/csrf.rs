use crate::error::AppError;
use crate::session::{self, AuthenticateFail, Session};
use crate::utils::sign;
use chrono::Utc;
use hyper::Request;
use hyper::body::Body;
use uuid::Uuid;

// csrf-token:[session key(base 64)].[timestamp].[signature]

pub async fn authenticate(req: &Request<impl Body>) -> Result<Session, AppError> {
    let session = session::authenticate(req).await?;
    Ok(session)
}

pub async fn authenticate_optional(req: &Request<impl Body>) -> Result<Option<Session>, AppError> {
    let session = session::authenticate(req).await;
    match session {
        Ok(session) => Ok(Some(session)),
        Err(AppError::Unauthenticated(AuthenticateFail::Guest)) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn generate_csrf_token(session_key: &Uuid) -> String {
    use base64::{Engine as _, engine::general_purpose::STANDARD_NO_PAD as base64_engine};

    let expire_sec = 60 * 60 * 3;
    let timestamp: i64 = Utc::now().timestamp() + expire_sec;
    let mut buffer = String::with_capacity(128);
    base64_engine.encode_string(session_key.as_bytes(), &mut buffer);
    buffer.push('.');
    buffer.push_str(&timestamp.to_string());
    let signature = sign(&buffer);
    buffer.push('.');
    base64_engine.encode_string(signature, &mut buffer);
    buffer
}

pub async fn get_csrf_token(req: Request<impl Body>) -> Result<String, AppError> {
    let session_id = if let Ok(session) = session::authenticate(&req).await {
        session.id
    } else {
        Uuid::nil()
    };

    Ok(generate_csrf_token(&session_id))
}
