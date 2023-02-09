use std::collections::HashMap;

use super::api::{CreateSpace, EditSpace, SpaceWithRelated};
use super::models::space_users_status;
use super::{Space, SpaceMember};
use crate::channels::{Channel, ChannelMember};
use crate::csrf::authenticate;
use crate::database;
use crate::error::{AppError, Find};
use crate::events::Event;
use crate::interface::{self, missing, ok_response, parse_query, IdQuery, Response};
use crate::spaces::api::{JoinSpace, KickFromSpace, SearchParams, SpaceWithMember};
use crate::spaces::models::SpaceMemberWithUser;
use crate::users::User;
use hyper::{Body, Request};
use uuid::Uuid;

async fn list(_req: Request<Body>) -> Result<Vec<Space>, AppError> {
    let mut conn = database::get().await?;
    Space::all(&mut *conn).await.map_err(Into::into)
}

async fn query(req: Request<Body>) -> Result<Space, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    let mut conn = database::get().await?;
    let db = &mut *conn;
    Space::get_by_id(db, &id).await?.or_not_found()
}

pub async fn space_related(id: &Uuid) -> Result<SpaceWithRelated, AppError> {
    let mut conn = database::get().await?;
    let db = &mut *conn;
    let space = Space::get_by_id(db, id).await?.or_not_found()?;
    let members = SpaceMemberWithUser::get_by_space(db, id).await?;
    let channels = Channel::get_by_space(db, id).await?;
    let mut cache = crate::cache::conn().await;
    let users_status = space_users_status(&mut cache, space.id).await?;
    let channel_members = ChannelMember::get_by_space(db, &space.id).await?;
    Ok(SpaceWithRelated {
        space,
        members,
        channels,
        users_status,
        channel_members,
    })
}

async fn query_with_related(req: Request<Body>) -> Result<SpaceWithRelated, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    space_related(&id).await
}

async fn token(req: Request<Body>) -> Result<Uuid, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let mut conn = database::get().await?;
    let db = &mut *conn;
    let is_admin = SpaceMember::get(db, &session.user_id, &id)
        .await?
        .map(|space_member| space_member.is_admin)
        .unwrap_or(false);
    if !is_admin {
        return Err(AppError::NoPermission(
            "A non-admin tries to get join token".to_string(),
        ));
    }
    Space::get_token(db, &id).await.map_err(Into::into)
}

async fn refresh_token(req: Request<Body>) -> Result<Uuid, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let mut conn = database::get().await?;
    let db = &mut *conn;
    let is_admin = SpaceMember::get(db, &session.user_id, &id)
        .await?
        .map(|space_member| space_member.is_admin)
        .unwrap_or(false);
    if !is_admin {
        return Err(AppError::NoPermission(
            "A non-admin tries to refresh join token".to_string(),
        ));
    }
    Space::refresh_token(db, &id).await.map_err(Into::into)
}

async fn my_spaces(req: Request<Body>) -> Result<Vec<SpaceWithMember>, AppError> {
    let session = authenticate(&req).await?;
    let mut conn = database::get().await?;
    let db = &mut *conn;
    Space::get_by_user(db, &session.user_id).await.map_err(Into::into)
}

async fn search(req: Request<Body>) -> Result<Vec<Space>, AppError> {
    let SearchParams { search } = parse_query(req.uri()).unwrap();
    let mut conn = database::get().await?;
    let db = &mut *conn;
    Space::search(db, search).await.map_err(Into::into)
}

async fn create(req: Request<Body>) -> Result<SpaceWithMember, AppError> {
    let session = authenticate(&req).await?;
    let CreateSpace {
        name,
        password,
        description,
        default_dice_type,
        first_channel_name,
    }: CreateSpace = interface::parse_body(req).await?;

    let mut conn = database::get().await?;
    let mut trans = conn.transaction().await?;
    let db = &mut trans;
    let default_dice_type = default_dice_type.as_deref();
    let user = User::get_by_id(db, &session.user_id)
        .await?
        .ok_or(AppError::NotFound("user"))?;
    let space = Space::create(db, name, &user.id, description, password, default_dice_type).await?;
    let member = SpaceMember::add_admin(db, &user.id, &space.id).await?;
    let channel = Channel::create(db, &space.id, &first_channel_name, true, default_dice_type).await?;
    ChannelMember::add_user(db, &user.id, &channel.id, "", true).await?;
    trans.commit().await?;
    log::info!("a space ({}) was just created", space.id);
    Ok(SpaceWithMember { space, member, user })
}

async fn edit(req: Request<Body>) -> Result<Space, AppError> {
    let session = authenticate(&req).await?;
    let EditSpace {
        space_id,
        name,
        description,
        default_dice_type,
        explorable,
        is_public,
        allow_spectator,
        grant_admins,
        remove_admins,
    }: EditSpace = interface::parse_body(req).await?;

    let mut conn = database::get().await?;
    let mut trans = conn.transaction().await?;
    let db = &mut trans;

    let space_member = SpaceMember::get(db, &session.user_id, &space_id)
        .await
        .or_no_permission()?;
    if !space_member.is_admin {
        return Err(AppError::NoPermission("A non-admin tries to edit space".to_string()));
    }
    let space = Space::edit(
        db,
        space_id,
        name,
        description,
        default_dice_type,
        explorable,
        is_public,
        allow_spectator,
    )
    .await?
    .ok_or_else(|| unexpected!("No such space found."))?;

    if space.owner_id == session.user_id {
        for user_id in grant_admins.iter() {
            SpaceMember::set_admin(db, &space_id, user_id, true).await?;
        }
        for user_id in remove_admins.iter() {
            if user_id != &space.owner_id {
                SpaceMember::set_admin(db, &space_id, user_id, false).await?;
            }
        }
    }
    trans.commit().await?;

    Event::space_updated(space_id);
    Ok(space)
}

async fn join(req: Request<Body>) -> Result<SpaceWithMember, AppError> {
    let session = authenticate(&req).await?;
    let JoinSpace { space_id, token } = parse_query(req.uri())?;

    let mut db = database::get().await?;
    let db = &mut *db;

    let space = Space::get_by_id(db, &space_id).await?.or_not_found()?;
    if !space.is_public && token != Some(space.invite_token) && space.owner_id != session.user_id {
        return Err(AppError::NoPermission(
            "A user tries to join group without token".to_string(),
        ));
    }
    let user_id = &session.user_id;
    let user = User::get_by_id(db, user_id)
        .await?
        .ok_or_else(|| unexpected!("No such user found."))?;
    let member = if &space.owner_id == user_id {
        SpaceMember::add_admin(db, user_id, &space_id).await?
    } else {
        SpaceMember::add_user(db, user_id, &space_id).await?
    };
    Event::space_updated(space_id);
    Ok(SpaceWithMember { space, member, user })
}

async fn leave(req: Request<Body>) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;

    let mut conn = database::get().await?;
    let mut trans = conn.transaction().await?;
    let db = &mut trans;

    let channels = SpaceMember::remove_user(db, &session.user_id, &id).await?;
    trans.commit().await?;
    Event::space_updated(id);
    for channel_id in channels {
        Event::push_members(channel_id);
    }
    Ok(true)
}

async fn kick(req: Request<Body>) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let KickFromSpace { space_id, user_id } = parse_query(req.uri())?;

    let mut conn = database::get().await?;
    let mut trans = conn.transaction().await?;
    let db = &mut trans;
    let my_member = SpaceMember::get(db, &session.user_id, &space_id).await.or_not_found()?;
    let kick_member = SpaceMember::get(db, &user_id, &space_id).await.or_not_found()?;
    if kick_member.is_admin {
        return Err(AppError::BadRequest("Can't kick admin".to_string()));
    }
    if my_member.is_admin {
        let channels = SpaceMember::remove_user(db, &user_id, &space_id).await?;
        trans.commit().await?;
        Event::space_updated(space_id);
        for channel_id in channels {
            Event::push_members(channel_id);
        }
        Ok(true)
    } else {
        Err(AppError::NoPermission("A non-admin tries to kick".to_string()))
    }
}

async fn members(req: Request<Body>) -> Result<HashMap<Uuid, SpaceMemberWithUser>, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    let mut db = database::get().await?;
    let db = &mut *db;
    SpaceMemberWithUser::get_by_space(&mut *db, &id)
        .await
        .map_err(Into::into)
}

async fn delete(req: Request<Body>) -> Result<Space, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    let mut conn = database::get().await?;
    let session = authenticate(&req).await?;
    let db = &mut *conn;
    let space = Space::get_by_id(db, &id).await.or_not_found()?;
    if space.owner_id == session.user_id {
        Space::delete(db, &id).await?;
        log::info!("A space ({}) was deleted", space.id);
        return Ok(space);
    }
    log::warn!("The user {} failed to try delete a space {}", session.user_id, space.id);
    Err(AppError::NoPermission("failed to delete".to_string()))
}

pub async fn router(req: Request<Body>, path: &str) -> Result<Response, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/list", Method::GET) => list(req).await.map(ok_response),
        ("/query", Method::GET) => query(req).await.map(ok_response),
        ("/query_with_related", Method::GET) => query_with_related(req).await.map(ok_response),
        ("/token", Method::GET) => token(req).await.map(ok_response),
        ("/refresh_token", Method::POST) => refresh_token(req).await.map(ok_response),
        ("/my", Method::GET) => my_spaces(req).await.map(ok_response),
        ("/search", Method::GET) => search(req).await.map(ok_response),
        ("/create", Method::POST) => create(req).await.map(ok_response),
        ("/edit", Method::POST) => edit(req).await.map(ok_response),
        ("/join", Method::POST) => join(req).await.map(ok_response),
        ("/leave", Method::POST) => leave(req).await.map(ok_response),
        ("/kick", Method::POST) => kick(req).await.map(ok_response),
        ("/members", Method::GET) => members(req).await.map(ok_response),
        ("/delete", Method::POST) => delete(req).await.map(ok_response),
        _ => missing(),
    }
}
