use super::api::Upload;
use super::models::Media;
use crate::csrf::authenticate;
use crate::error::{AppError, Find, ValidationFailed};
use crate::interface::{Response, missing, ok_response, parse_query};
use crate::media::api::{MediaInfoQuery, MediaQuery, PreSign, PreSignResult};
use crate::media::models::{MediaFile, MediaInfo};
use crate::rate_limit;
use crate::utils::id;
use governor::{DefaultKeyedRateLimiter, RateLimiter};
use hyper::body::{Body, Incoming};
use hyper::header::{self, HeaderValue};
use hyper::{Request, Uri};
use rusty_s3::S3Action;
use std::sync::LazyLock;
use uuid::Uuid;

const SUPPORTED_MEDIA_TYPES: [&str; 5] = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/pdf",
];

static UPLOAD_LIMITER: LazyLock<DefaultKeyedRateLimiter<Uuid>> =
    LazyLock::new(|| RateLimiter::keyed(rate_limit::per_hour(rate_limit::UPLOAD_USER_PER_HOUR)));

pub fn start_rate_limiter_cleanup() {
    rate_limit::start_cleanup_task(
        || {
            UPLOAD_LIMITER.retain_recent();
        },
        || {
            UPLOAD_LIMITER.shrink_to_fit();
        },
    );
}

pub fn check_upload_rate_limit(user_id: &Uuid) -> Result<(), AppError> {
    UPLOAD_LIMITER
        .check_key(user_id)
        .map_err(|_| AppError::LimitExceeded("Too many uploads, please try again later."))
}

fn content_disposition(attachment: bool, filename: &str) -> HeaderValue {
    use percent_encoding::{AsciiSet, NON_ALPHANUMERIC, utf8_percent_encode};
    let kind = if attachment { "attachment" } else { "inline" };
    const SET: &AsciiSet = NON_ALPHANUMERIC;
    let filename = utf8_percent_encode(filename, SET).to_string();
    HeaderValue::from_str(&format!("{kind}; filename*=utf-8''{filename}")).unwrap()
}

fn filename_sanitizer(filename: String) -> String {
    let filename_replace = regex!(r"[/?*:|<>\\]");
    filename_replace.replace_all(&filename, "_").to_string()
}

fn validate_filename(filename: String) -> Result<String, AppError> {
    if filename.len() > 200 {
        return Err(ValidationFailed("File Name is too long").into());
    }
    Ok(filename_sanitizer(filename))
}

fn validate_media_type(mime_type: &str) -> Result<(), AppError> {
    if SUPPORTED_MEDIA_TYPES.contains(&mime_type) {
        Ok(())
    } else {
        Err(ValidationFailed("Unsupported media type").into())
    }
}

pub fn upload_params(uri: &Uri) -> Result<Upload, AppError> {
    let Upload {
        filename,
        mime_type,
        size,
    } = parse_query(uri)?;
    let filename = validate_filename(filename)?;
    Ok(Upload {
        filename,
        mime_type,
        size,
    })
}

fn check_size(size: usize, max_size: usize) -> Result<(), AppError> {
    if size == 0 {
        return Err(ValidationFailed("File size must be greater than 0.").into());
    }
    if size > max_size {
        return Err(ValidationFailed("File size must be less than 16MB.").into());
    }
    Ok(())
}

pub async fn upload(
    storage: &crate::s3::Storage,
    req: Request<Incoming>,
    id: Uuid,
    params: Upload,
    max_size: usize,
) -> Result<MediaFile, AppError> {
    let Upload {
        filename,
        mime_type,
        size,
    } = params;
    metrics::counter!("boluo_server_media_upload_total").increment(1);
    metrics::histogram!("boluo_server_media_upload_size_bytes").record(size as f64);

    let mime_type = mime_type.unwrap_or_default();

    check_size(size, max_size)?;
    let body = crate::interface::read_body_limited(req, max_size).await?;
    if body.len() != size {
        return Err(
            ValidationFailed("Uploaded file size does not match the declared size.").into(),
        );
    }
    put_object(
        storage,
        &id.as_hyphenated().to_string(),
        body,
        &mime_type,
        size as i32,
    )
    .await?;
    let media_file = MediaFile {
        id,
        mime_type,
        filename: String::new(),
        original_filename: filename,
        hash: String::new(),
        size,
        duplicate: false,
    };
    Ok(media_file)
}

async fn media_upload(
    ctx: &crate::context::AppContext,
    req: Request<Incoming>,
) -> Result<Media, AppError> {
    let session = authenticate(ctx, &req).await?;
    check_upload_rate_limit(&session.user_id)?;
    let params = upload_params(req.uri())?;
    validate_media_type(params.mime_type.as_deref().unwrap_or_default())?;
    let media_id = id();
    let media_file = upload(ctx.storage(), req, media_id, params, 1024 * 1024 * 16).await?;
    media_file
        .create(&ctx.db, session.user_id, "")
        .await
        .map_err(Into::into)
}

async fn get(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Response, AppError> {
    let MediaQuery {
        id,
        filename,
        download,
    } = parse_query(req.uri())?;
    metrics::counter!("boluo_server_media_get_total").increment(1);

    let media = if let Some(id) = id {
        MediaInfo::get_with_cache(&ctx.db, id)
            .await
            .or_not_found()?
    } else if let Some(filename) = filename {
        let media = Media::get_by_filename(&ctx.db, &filename)
            .await
            .or_not_found()?;
        MediaInfo {
            id: media.id,
            mime_type: media.mime_type,
            original_filename: media.original_filename,
            size: media.size,
        }
    } else {
        return Err(AppError::BadRequest(
            "Filename or media id must be specified.".to_string(),
        ));
    };

    let is_download_redirect = download && req.method() == hyper::Method::GET;
    let (status, url) = if is_download_redirect {
        (
            hyper::StatusCode::TEMPORARY_REDIRECT,
            get_object_download_url(ctx.storage(), &media),
        )
    } else {
        (
            hyper::StatusCode::MOVED_PERMANENTLY,
            format!("{}/{}", ctx.media_public_url(), media.id),
        )
    };
    let mut response = hyper::Response::builder()
        .status(status)
        .header(header::LOCATION, url);
    if is_download_redirect {
        response = response.header(header::CACHE_CONTROL, "private, no-store");
    }
    let response = response
        .body(crate::interface::ResponseBytes::new())
        .map_err(error_unexpected!("Failed to build media redirect response"))?;
    Ok(response)
}

async fn info(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<MediaInfo, AppError> {
    let MediaInfoQuery { id } = parse_query(req.uri())?;
    metrics::counter!("boluo_server_media_info_total").increment(1);
    MediaInfo::get_with_cache(&ctx.db, id).await.or_not_found()
}

fn get_object_download_url(storage: &crate::s3::Storage, media: &MediaInfo) -> String {
    let disposition = content_disposition(true, &media.original_filename);
    let object_key = media.id.to_string();
    let mut action = storage
        .bucket()
        .get_object(Some(storage.credentials()), &object_key);
    action.query_mut().insert(
        "response-content-disposition",
        disposition
            .to_str()
            .expect("Content-Disposition is valid ASCII")
            .to_owned(),
    );
    action
        .sign(std::time::Duration::from_secs(EXPIRES_IN_SEC))
        .to_string()
}

async fn put_object(
    storage: &crate::s3::Storage,
    key: &str,
    body: bytes::Bytes,
    content_type: &str,
    content_length: i32,
) -> Result<(), AppError> {
    let mut action = storage
        .bucket()
        .put_object(Some(storage.credentials()), key);
    action.headers_mut().insert("content-type", content_type);
    let url = action.sign(std::time::Duration::from_secs(60));

    let response = storage
        .client()
        .put(url.as_str())
        .header("content-type", content_type)
        .header("content-length", content_length)
        .body(body)
        .send()
        .await
        .map_err(error_unexpected!("Failed to upload object"))?;
    if !response.status().is_success() {
        return Err(AppError::Unexpected(anyhow::anyhow!(
            "S3 PUT failed with status {}",
            response.status()
        )));
    }
    Ok(())
}

fn put_object_presigned(
    storage: &crate::s3::Storage,
    key: &str,
    expires_in: u64,
    content_type: &str,
) -> String {
    let mut action = storage
        .bucket()
        .put_object(Some(storage.credentials()), key);
    action.headers_mut().insert("content-type", content_type);
    action
        .sign(std::time::Duration::from_secs(expires_in))
        .to_string()
}

const EXPIRES_IN_SEC: u64 = 60 * 10;
async fn presigned(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<PreSignResult, AppError> {
    let session = authenticate(ctx, &req).await?;
    let PreSign {
        filename,
        mime_type,
        size,
    } = parse_query(req.uri())?;
    let filename = validate_filename(filename)?;
    validate_media_type(&mime_type)?;
    check_upload_rate_limit(&session.user_id)?;
    metrics::counter!("boluo_server_media_presigned_total").increment(1);
    metrics::histogram!("boluo_server_media_upload_size_bytes").record(size as f64);

    if size <= 0 {
        return Err(ValidationFailed("File size must be greater than 0.").into());
    }
    if size > 1024 * 1024 * 16 {
        return Err(ValidationFailed("File size must be less than 16MB.").into());
    }
    let media_id = id();
    let media = Media::create(
        &ctx.db,
        &media_id,
        &mime_type,
        session.user_id,
        &filename,
        &filename,
        String::new(),
        size,
        "",
    )
    .await?;
    let uri = put_object_presigned(
        ctx.storage(),
        &media.id.as_hyphenated().to_string(),
        EXPIRES_IN_SEC,
        &mime_type,
    );
    Ok(PreSignResult {
        url: uri.to_string(),
        media_id: media.id,
    })
}

pub async fn router(
    ctx: &crate::context::AppContext,
    req: Request<Incoming>,
    path: &str,
) -> Result<Response, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/get", Method::GET) => get(ctx, req).await,
        ("/get", Method::HEAD) => get(ctx, req).await,
        ("/info", Method::GET) => info(ctx, req).await.map(ok_response),
        ("/upload", Method::POST) => media_upload(ctx, req).await.map(ok_response),
        ("/presigned", Method::POST) => presigned(ctx, req).await.map(ok_response),
        _ => missing(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::s3::{Storage, StorageConfig};

    fn test_storage() -> Storage {
        Storage::new(StorageConfig {
            endpoint_url: Some("https://example.r2.cloudflarestorage.com".to_string()),
            bucket_name: Some("media".to_string()),
            access_key_id: Some("access-key".to_string()),
            secret_access_key: Some("secret-key".to_string()),
        })
    }

    #[test]
    fn accepts_pdf_and_supported_image_media_types() {
        for mime_type in SUPPORTED_MEDIA_TYPES {
            assert!(
                validate_media_type(mime_type).is_ok(),
                "expected {mime_type} to be supported"
            );
        }
    }

    #[test]
    fn rejects_unlisted_media_types() {
        for mime_type in ["application/octet-stream", "image/svg+xml", "text/html"] {
            assert!(
                validate_media_type(mime_type).is_err(),
                "expected {mime_type} to be rejected"
            );
        }
    }

    #[test]
    fn download_url_overrides_content_disposition() {
        let media = MediaInfo {
            id: Uuid::parse_str("0199359d-9890-7ba3-8984-5d4613483c8f").unwrap(),
            mime_type: "application/pdf".to_string(),
            original_filename: "冒险手册.pdf".to_string(),
            size: 1024,
        };

        let url = url::Url::parse(&get_object_download_url(&test_storage(), &media)).unwrap();
        let disposition = url
            .query_pairs()
            .find_map(|(key, value)| {
                (key == "response-content-disposition").then(|| value.into_owned())
            })
            .expect("response-content-disposition query");

        assert_eq!(
            disposition,
            "attachment; filename*=utf-8''%E5%86%92%E9%99%A9%E6%89%8B%E5%86%8C%2Epdf"
        );
    }
}
