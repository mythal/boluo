use super::api::Upload;
use super::models::Media;
use crate::csrf::authenticate;
use crate::database;
use crate::error::{AppError, Find, ValidationFailed};
use crate::interface::{missing, ok_response, parse_query, Response};
use crate::media::api::MediaQuery;
use crate::media::models::MediaFile;
use crate::utils;
use futures::StreamExt;
use hyper::header::{self, HeaderValue};
use hyper::{Body, Request, Uri};
use std::path::PathBuf;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

fn content_disposition(attachment: bool, filename: &str) -> HeaderValue {
    use percent_encoding::{utf8_percent_encode, AsciiSet, NON_ALPHANUMERIC};
    let kind = if attachment { "attachment" } else { "inline" };
    const SET: &AsciiSet = NON_ALPHANUMERIC;
    let filename = utf8_percent_encode(filename, SET).to_string();
    HeaderValue::from_str(&format!("{kind}; filename*=utf-8''{filename}")).unwrap()
}

fn filename_sanitizer(filename: String) -> String {
    let filename_replace = regex!(r#"[/?*:|<>\\]"#);
    filename_replace.replace_all(&filename, "_").to_string()
}

pub fn upload_params(uri: &Uri) -> Result<Upload, AppError> {
    let Upload { filename, mime_type } = parse_query(uri)?;
    if filename.len() > 200 {
        return Err(ValidationFailed("File Name is too long").into());
    }
    let filename = filename_sanitizer(filename);
    Ok(Upload { filename, mime_type })
}

pub async fn upload(req: Request<Body>, params: Upload, max_size: usize) -> Result<MediaFile, AppError> {
    let Upload { filename, mime_type } = params;
    let id = utils::id();
    let temp_filename = format!("{id}_{filename}");

    let path = Media::path(&temp_filename);
    let mut file = File::create(&path).await?;
    let mut body = req.into_body();
    let mut hasher = blake3::Hasher::new();
    let mut size: usize = 0;
    while let Some(bytes) = body.next().await {
        let bytes = bytes?;
        size += bytes.len();
        if size > max_size {
            tokio::fs::remove_file(&*path).await.ok();
            return Err(AppError::BadRequest(
                "The maximum file size has been exceeded.".to_string(),
            ));
        }
        hasher.update(&bytes);
        file.write_all(&bytes).await?;
    }

    let hash = hasher.finalize();
    let hash = hash.to_hex().to_string();
    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");

    let new_filename = format!("{hash}.{ext}");
    let new_path = Media::path(&new_filename);
    let duplicate = new_path.exists();
    if duplicate {
        tokio::fs::remove_file(path).await?;
    } else {
        tokio::fs::rename(path, new_path).await?;
    }

    let mime_type = mime_type.unwrap_or_default();
    let media_file = MediaFile {
        mime_type,
        filename: new_filename,
        original_filename: filename,
        hash,
        size,
        duplicate,
    };
    Ok(media_file)
}

async fn media_upload(req: Request<Body>) -> Result<Media, AppError> {
    let session = authenticate(&req).await?;
    let params = upload_params(req.uri())?;
    let media_file = upload(req, params, 1024 * 1024 * 16).await?;
    let mut conn = database::get().await?;
    media_file
        .create(&mut *conn, session.user_id, "")
        .await
        .map_err(Into::into)
}

async fn send_file(path: PathBuf, mut sender: hyper::body::Sender) -> Result<(), anyhow::Error> {
    use bytes::BytesMut;
    use tokio::io::AsyncReadExt;

    let mut file = File::open(path).await?;
    let mut buffer = BytesMut::with_capacity(1024);
    while let Ok(read) = file.read_buf(&mut buffer).await {
        if read == 0 {
            break;
        }
        sender.send_data(buffer.clone().freeze()).await?;
        buffer.clear();
    }
    Ok(())
}

async fn get(req: Request<Body>) -> Result<Response, AppError> {
    let MediaQuery { id, filename, download } = parse_query(req.uri())?;
    let method = req.method().clone();

    let mut conn = database::get().await?;
    let db = &mut *conn;
    let mut media: Option<Media> = None;
    if let Some(id) = id {
        media = Some(Media::get_by_id(db, &id).await.or_not_found()?);
    } else if let Some(filename) = filename {
        media = Some(Media::get_by_filename(db, &filename).await.or_not_found()?);
    }
    let media = media.ok_or_else(|| AppError::BadRequest("Filename or media id must be specified.".to_string()))?;
    let path = Media::path(&media.filename);
    let size = std::fs::metadata(&path)
        .map(|metadata| metadata.len())
        .map_err(|_| AppError::NotFound("Failed to read file information."))?;

    let body = if method == hyper::Method::HEAD {
        Body::empty()
    } else {
        let (sender, body) = Body::channel();
        tokio::spawn(async move {
            if let Err(e) = send_file(path, sender).await {
                log::error!("Failed to send file: {}", e);
            }
        });
        body
    };

    let mut response_builder = hyper::Response::builder()
        .header(header::ACCEPT_RANGES, HeaderValue::from_static("none"))
        .header(header::CONTENT_LENGTH, HeaderValue::from(size))
        .header(header::CACHE_CONTROL, HeaderValue::from_static("max-age=31536000")) // for year
        .header(
            header::CONTENT_DISPOSITION,
            content_disposition(download, &media.original_filename),
        );
    if !media.mime_type.is_empty() {
        response_builder = response_builder.header(
            header::CONTENT_TYPE,
            HeaderValue::from_str(&media.mime_type).map_err(error_unexpected!())?,
        );
    }
    let response = response_builder.body(body).map_err(error_unexpected!())?;
    Ok(response)
}

async fn delete(_req: Request<Body>) -> Result<(), AppError> {
    todo!()
}

pub async fn router(req: Request<Body>, path: &str) -> Result<Response, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/get", Method::GET) => get(req).await,
        ("/get", Method::HEAD) => get(req).await,
        ("/upload", Method::POST) => media_upload(req).await.map(ok_response),
        _ => missing(),
    }
}
