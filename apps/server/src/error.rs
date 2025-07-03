use crate::session::AuthenticateFail;
use hyper::{StatusCode, Uri};
use redis::RedisError;
use std::error::Error;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("An unexpected database error occurred: {source}")]
    Db { source: sqlx::Error },
    #[error("Authentication failed")]
    Unauthenticated(#[from] AuthenticateFail),
    #[error("Resource not found")]
    NotFound(&'static str),
    #[error("Permission denied: {0}")]
    NoPermission(String),
    #[error("Validation failed: {0}")]
    Validation(#[from] ValidationFailed),
    #[error("An unexpected error occurred")]
    Unexpected(anyhow::Error),
    #[error("An unexpected serialize error occurred")]
    Serialize(serde_json::Error),
    #[error("Bad request: {0}")]
    BadRequest(String),
    #[error("Method not allowed")]
    MethodNotAllowed,
    #[error("Resource already exists")]
    Conflict(String),
    #[error("Limit exceed")]
    LimitExceeded(&'static str),
    #[error("An I/O error occurred")]
    Hyper {
        #[from]
        source: hyper::Error,
    },
    #[error("An I/O error occurred")]
    TokioIo {
        #[from]
        source: tokio::io::Error,
    },

    #[error("An unexpected redis error occurred: {source}")]
    Redis {
        #[from]
        source: RedisError,
    },
}

impl AppError {
    pub fn status_code(&self) -> StatusCode {
        use AppError::*;
        match self {
            Unauthenticated(_) => StatusCode::UNAUTHORIZED,
            NotFound(_) => StatusCode::NOT_FOUND,
            NoPermission(_) => StatusCode::FORBIDDEN,
            Validation(_) | BadRequest(_) => StatusCode::BAD_REQUEST,
            MethodNotAllowed => StatusCode::METHOD_NOT_ALLOWED,
            Conflict(_) => StatusCode::CONFLICT,
            LimitExceeded(_) => StatusCode::TOO_MANY_REQUESTS,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    pub fn error_code(&self) -> &'static str {
        use AppError::*;
        match self {
            Unauthenticated(_) => "UNAUTHENTICATED",
            NotFound(_) => "NOT_FOUND",
            NoPermission(_) => "NO_PERMISSION",
            Validation(_) => "VALIDATION_FAIL",
            BadRequest(_) => "BAD_REQUEST",
            MethodNotAllowed => "METHOD_NOT_ALLOWED",
            LimitExceeded(_) => "LIMIT_EXCEEDED",
            Conflict(_) => "CONFLICT",
            _ => "UNEXPECTED",
        }
    }

    pub fn context(&self) -> serde_json::Value {
        use AppError::*;
        use serde_json::Value;
        match self {
            NotFound(something) => Value::String(something.to_string()),
            Conflict(something) => Value::String(something.clone()),
            LimitExceeded(what) => Value::String(what.to_string()),
            _ => Value::Null,
        }
    }

    pub fn table(&self) -> Option<String> {
        match self {
            AppError::NotFound(table) => Some(table.to_string()),
            AppError::Conflict(table) => Some(table.to_string()),
            _ => None,
        }
    }

    pub fn missing() -> AppError {
        AppError::NotFound("Failed to match route")
    }

    pub fn unexpected<E: Error + Send + Sync + 'static>(e: E) -> AppError {
        AppError::Unexpected(e.into())
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> AppError {
        ModelError::from(e).into()
    }
}

macro_rules! unexpected {
    ($msg: expr) => {{
        let msg = $msg.to_string();
        ::tracing::error!("Unexpected error: [{}][{}]{}", file!(), line!(), msg);
        crate::error::AppError::Unexpected(::anyhow::anyhow!(msg))
    }};
}

macro_rules! error_unexpected {
    () => {
        |e| {
            ::tracing::error!("Unexpected error: [{}][{}]{}", file!(), line!(), e);
            crate::error::AppError::Unexpected(e.into())
        }
    };
    ($msg: expr) => {
        |e| {
            ::tracing::error!("Unexpected error: [{}][{}]{}{}", file!(), line!(), $msg, e);
            crate::error::AppError::Unexpected(::anyhow::anyhow!($msg))
        }
    };
}

#[derive(Error, Debug, Eq, PartialEq)]
#[error("{0}")]
pub struct ValidationFailed(pub &'static str);

#[derive(Error, Debug)]
pub enum ModelError {
    #[error("{0}")]
    Validation(#[from] ValidationFailed),
    #[error("{0}")]
    Db(sqlx::Error),
    #[error("{0} already exists")]
    Conflict(String),
}

impl From<ModelError> for AppError {
    fn from(e: ModelError) -> Self {
        match e {
            ModelError::Validation(e) => AppError::Validation(e),
            ModelError::Db(source) => AppError::Db { source },
            ModelError::Conflict(type_) => AppError::Conflict(type_),
        }
    }
}

impl From<sqlx::Error> for ModelError {
    fn from(e: sqlx::Error) -> Self {
        if let Some(e) = e.as_database_error() {
            if e.is_unique_violation() {
                return ModelError::Conflict(e.table().unwrap_or("Unknown").to_string());
            } else if e.is_check_violation() {
                return ModelError::Validation(ValidationFailed("Check constraint violation"));
            } else if e.is_foreign_key_violation() {
                return ModelError::Validation(ValidationFailed(
                    "Foreign key constraint violation",
                ));
            }
        }
        ModelError::Db(e)
    }
}

pub fn log_error(e: &AppError, uri: &Uri) {
    use crate::error::AppError::*;

    let error_code = e.error_code();
    let status_code = e.status_code().as_u16();

    match e {
        NotFound(resource) => {
            tracing::debug!(
                uri = %uri,
                error_code = error_code,
                status_code = status_code,
                resource = resource,
                "Resource not found"
            );
        }
        Conflict(detail) => {
            tracing::warn!(
                uri = %uri,
                error_code = error_code,
                status_code = status_code,
                detail = detail,
                "Conflict error"
            );
        }
        Validation(validation_error) => {
            tracing::warn!(
                uri = %uri,
                error_code = error_code,
                status_code = status_code,
                validation_error = %validation_error,
                "Validation failed"
            );
        }
        BadRequest(detail) => {
            tracing::warn!(
                uri = %uri,
                error_code = error_code,
                status_code = status_code,
                detail = detail,
                "Bad request"
            );
        }
        Unauthenticated(auth_fail) => {
            tracing::warn!(
                uri = %uri,
                error_code = error_code,
                status_code = status_code,
                auth_fail_reason = %auth_fail,
                "Authentication failed"
            );
        }
        NoPermission(detail) => {
            tracing::warn!(
                uri = %uri,
                error_code = error_code,
                status_code = status_code,
                detail = detail,
                "Permission denied"
            );
        }
        LimitExceeded(limit_type) => {
            tracing::warn!(
                uri = %uri,
                error_code = error_code,
                status_code = status_code,
                limit_type = limit_type,
                "Rate limit exceeded"
            );
        }
        MethodNotAllowed => {
            tracing::info!(
                uri = %uri,
                error_code = error_code,
                status_code = status_code,
                "Method not allowed"
            );
        }
        e => {
            tracing::error!(
                uri = %uri,
                error_code = error_code,
                status_code = status_code,
                error = %e,
                "Internal server error"
            );

            // Log error chain for debugging
            let mut source: Option<&_> = e.source();
            let mut depth = 0;
            while let Some(source_error) = source {
                depth += 1;
                tracing::error!(
                    depth = depth,
                    source_error = %source_error,
                    "Error source chain"
                );
                source = source_error.source();

                // Prevent infinite loops
                if depth > 10 {
                    tracing::error!("Error chain too deep, stopping");
                    break;
                }
            }
        }
    }
}

pub trait Find<T: Sized> {
    fn or_no_permission(self) -> Result<T, AppError>;
    fn or_not_found(self) -> Result<T, AppError>;
}

impl<T> Find<T> for Result<Option<T>, sqlx::Error> {
    fn or_no_permission(self) -> Result<T, AppError> {
        match self {
            Err(source) => Err(AppError::Db { source }),
            Ok(x) => x.or_no_permission(),
        }
    }
    fn or_not_found(self) -> Result<T, AppError> {
        match self {
            Err(source) => Err(AppError::Db { source }),
            Ok(x) => x.or_not_found(),
        }
    }
}

impl<T> Find<T> for Option<T> {
    fn or_no_permission(self) -> Result<T, AppError> {
        match self {
            None => Err(AppError::NoPermission(format!(
                "Can't find {}",
                std::any::type_name::<T>()
            ))),
            Some(x) => Ok(x),
        }
    }
    fn or_not_found(self) -> Result<T, AppError> {
        match self {
            None => Err(AppError::NotFound(std::any::type_name::<T>())),
            Some(x) => Ok(x),
        }
    }
}

pub fn row_not_found<T>(e: sqlx::Error) -> Result<Option<T>, sqlx::Error> {
    if let sqlx::Error::RowNotFound = e {
        Ok(None)
    } else {
        Err(e)
    }
}
