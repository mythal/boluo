use crate::error::AppError;
use crate::session::{self, Session};
use crate::utils::sign;
use chrono::Utc;
use hyper::body::Body;
use hyper::Request;
use uuid::Uuid;

// csrf-token:[session key(base 64)].[timestamp].[signature]

pub async fn authenticate(req: &Request<impl Body>) -> Result<Session, AppError> {
    let session = session::authenticate(req).await?;
    Ok(session)
}

pub fn generate_csrf_token(session_key: &Uuid) -> String {
    use base64::{engine::general_purpose::STANDARD_NO_PAD as base64_engine, Engine as _};

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
