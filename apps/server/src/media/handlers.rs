use super::api::Upload;
use super::models::Media;
use crate::context::media_public_url;
use crate::csrf::authenticate;
use crate::error::{AppError, Find, ValidationFailed};
use crate::interface::{Response, missing, ok_response, parse_query};
use crate::media::api::{MediaQuery, PreSign, PreSignResult};
use crate::media::models::MediaFile;
use crate::utils::id;
use http_body_util::BodyExt;
use rusty_s3::S3Action;
use hyper::body::{Body, Incoming};
use hyper::header::{self, HeaderValue};
use hyper::{Request, Uri};
use uuid::Uuid;

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

pub fn upload_params(uri: &Uri) -> Result<Upload, AppError> {
    let Upload {
        filename,
        mime_type,
        size,
    } = parse_query(uri)?;
    if filename.len() > 200 {
        return Err(ValidationFailed("File Name is too long").into());
    }
    let filename = filename_sanitizer(filename);
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
    let body = req.into_body();
    put_object(
        crate::s3::get_bucket(),
        crate::s3::get_credentials(),
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
    let session = authenticate(&req).await?;
    let params = upload_params(req.uri())?;
    let media_id = id();
    let media_file = upload(req, media_id, params, 1024 * 1024 * 16).await?;
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
        download: _,
    } = parse_query(req.uri())?;
    metrics::counter!("boluo_server_media_get_total").increment(1);
    let _method = req.method().clone();

    let mut media: Option<Media> = None;
    if let Some(id) = id {
        media = Some(Media::get_by_id(&ctx.db, &id).await.or_not_found()?);
    } else if let Some(filename) = filename {
        media = Some(
            Media::get_by_filename(&ctx.db, &filename)
                .await
                .or_not_found()?,
        );
    }
    let media = media.ok_or_else(|| {
        AppError::BadRequest("Filename or media id must be specified.".to_string())
    })?;

    let url = format!("{}/{}", media_public_url().trim_end_matches('/'), media.id);
    let response = hyper::Response::builder()
        .status(hyper::StatusCode::MOVED_PERMANENTLY)
        .header(header::LOCATION, url)
        .body(Vec::new())
        .map_err(error_unexpected!("Failed to build media redirect response"))?;
    Ok(response)
}

async fn put_object(
    bucket: &rusty_s3::Bucket,
    credentials: &rusty_s3::Credentials,
    key: &str,
    body: hyper::body::Incoming,
    content_type: &str,
    content_length: i32,
) -> Result<(), AppError> {
    let bytes = body
        .collect()
        .await
        .map_err(error_unexpected!("Failed to read request body"))?
        .to_bytes();

    let mut action = bucket.put_object(Some(credentials), key);
    action.headers_mut().insert("content-type", content_type);
    let url = action.sign(std::time::Duration::from_secs(60));

    let response = crate::s3::get_http_client()
        .put(url.as_str())
        .header("content-type", content_type)
        .header("content-length", content_length)
        .body(bytes)
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
    bucket: &rusty_s3::Bucket,
    credentials: &rusty_s3::Credentials,
    key: &str,
    expires_in: u64,
    content_type: &str,
) -> String {
    let mut action = bucket.put_object(Some(credentials), key);
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
    use crate::s3;
    let session = authenticate(&req).await?;
    let PreSign {
        filename,
        mime_type,
        size,
    } = parse_query(req.uri())?;
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
        s3::get_bucket(),
        s3::get_credentials(),
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
        ("/upload", Method::POST) => media_upload(ctx, req).await.map(ok_response),
        ("/presigned", Method::POST) => presigned(ctx, req).await.map(ok_response),
        _ => missing(),
    }
}
