use hyper::Request;
use hyper::body::Body;

use super::Asset;
use super::api::{CreateAsset, DeleteAsset, ListAssets, QueryAsset, UpdateAsset};
use crate::csrf::{authenticate, authenticate_optional};
use crate::error::{AppError, Find};
use crate::interface::{missing, parse_body, parse_query, response};
use crate::media::models::Media;
use crate::spaces::{SpaceMember, resolve_space_access};

async fn query(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Asset, AppError> {
    let session = authenticate_optional(&req).await?;
    let QueryAsset { space_id, asset_id } = parse_query(req.uri())?;
    let asset = Asset::get_by_id_in_space(&ctx.db, space_id, asset_id)
        .await
        .or_not_found()?;
    let user_id = session.map(|session| session.user_id);
    let is_creator = user_id.is_some_and(|user_id| asset.creator_id == Some(user_id));
    let access = resolve_space_access(ctx, space_id, user_id).await?;
    if !is_creator && !access.can_access {
        return Err(AppError::NoPermission(
            "You don't have permission to view this Asset".to_string(),
        ));
    }
    Ok(asset)
}

async fn by_creator(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<Asset>, AppError> {
    let session = authenticate(&req).await?;
    Asset::list_by_creator(&ctx.db, session.user_id)
        .await
        .map_err(Into::into)
}

async fn by_space(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<Asset>, AppError> {
    let session = authenticate_optional(&req).await?;
    let ListAssets { space_id } = parse_query(req.uri())?;
    let access =
        resolve_space_access(ctx, space_id, session.map(|session| session.user_id)).await?;
    if !access.is_member && !access.can_manage() {
        return Err(AppError::NoPermission(
            "You don't have permission to view Assets in this Space".to_string(),
        ));
    }
    Asset::list_by_space(&ctx.db, space_id)
        .await
        .map_err(Into::into)
}

async fn create(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Asset, AppError> {
    let session = authenticate(&req).await?;
    let CreateAsset {
        space_id,
        media_id,
        name,
        policy,
    } = parse_body(req).await?;
    let mut transaction = ctx.db.begin().await?;
    SpaceMember::get(&mut *transaction, &session.user_id, &space_id)
        .await?
        .or_no_permission()?;
    let media = Media::get_by_id(&mut *transaction, &media_id)
        .await
        .or_not_found()?;
    if media.uploader_id != session.user_id {
        return Err(AppError::NoPermission(
            "Only the uploader can register this Media as an Asset".to_string(),
        ));
    }
    let asset = Asset::create(
        &mut transaction,
        space_id,
        media_id,
        session.user_id,
        &name,
        policy,
    )
    .await?;
    transaction.commit().await?;
    Ok(asset)
}

async fn update(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Asset, AppError> {
    let session = authenticate(&req).await?;
    let UpdateAsset {
        asset_id,
        name,
        policy,
    } = parse_body(req).await?;
    let mut transaction = ctx.db.begin().await?;
    let asset = Asset::get_by_id_for_update(&mut transaction, asset_id)
        .await
        .or_not_found()?;
    let access = resolve_space_access(ctx, asset.space_id, Some(session.user_id)).await?;
    let is_creator = asset.creator_id == Some(session.user_id);
    if !asset
        .policy
        .can_edit(asset.creator_id, session.user_id, access)
    {
        return Err(AppError::NoPermission(
            "You don't have permission to edit this Asset".to_string(),
        ));
    }
    if policy != asset.policy && !is_creator {
        return Err(AppError::NoPermission(
            "Only the Asset creator can change its policy".to_string(),
        ));
    }
    let asset = Asset::update(&mut transaction, asset_id, &name, policy).await?;
    transaction.commit().await?;
    Ok(asset)
}

async fn delete(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Asset, AppError> {
    let session = authenticate(&req).await?;
    let DeleteAsset { asset_id } = parse_body(req).await?;
    let mut transaction = ctx.db.begin().await?;
    let asset = Asset::get_by_id_for_update(&mut transaction, asset_id)
        .await
        .or_not_found()?;
    let access = resolve_space_access(ctx, asset.space_id, Some(session.user_id)).await?;
    if !asset
        .policy
        .can_delete(asset.creator_id, session.user_id, access)
    {
        return Err(AppError::NoPermission(
            "You don't have permission to delete this Asset".to_string(),
        ));
    }
    if !Asset::delete(&mut transaction, asset_id).await? {
        return Err(AppError::NotFound("Asset"));
    }
    transaction.commit().await?;
    Ok(asset)
}

pub async fn router(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
    path: &str,
) -> Result<hyper::Response<Vec<u8>>, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/query", Method::GET) => response(query(ctx, req).await).await,
        ("/by_space", Method::GET) => response(by_space(ctx, req).await).await,
        ("/by_creator", Method::GET) => response(by_creator(ctx, req).await).await,
        ("/create", Method::POST) => response(create(ctx, req).await).await,
        ("/update", Method::POST) => response(update(ctx, req).await).await,
        ("/delete", Method::POST) => response(delete(ctx, req).await).await,
        _ => missing(),
    }
}
