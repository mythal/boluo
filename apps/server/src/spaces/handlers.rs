use std::collections::HashMap;

use super::api::{CreateSpace, EditSpace, QuerySpace, SpaceWithRelated};
use super::{Space, SpaceMember};
use crate::channels::models::Member;
use crate::channels::{Channel, ChannelMember, ChannelType};
use crate::csrf::authenticate;
use crate::db;
use crate::error::{AppError, Find};
use crate::events::models::space_users_status;
use crate::events::{StatusMap, Update};
use crate::interface::{self, missing, ok_response, parse_query, IdQuery, Response};
use crate::spaces::api::{JoinSpace, KickFromSpace, SearchParams, SpaceWithMember};
use crate::spaces::models::SpaceMemberWithUser;
use crate::users::User;
use arc_swap::ArcSwap;
use hyper::body::Body;
use hyper::Request;
use uuid::Uuid;

async fn list(_req: Request<impl Body>) -> Result<Vec<Space>, AppError> {
    struct SpaceList {
        spaces: Vec<Space>,
        instant: std::time::Instant,
    }
    async fn init_spaces() -> ArcSwap<SpaceList> {
        let pool = db::get().await;
        let spaces = Space::all(&pool).await.unwrap_or_default();
        ArcSwap::new(std::sync::Arc::new(SpaceList {
            spaces,
            instant: std::time::Instant::now(),
        }))
    }

    static CACHE: tokio::sync::OnceCell<ArcSwap<SpaceList>> = tokio::sync::OnceCell::const_new();
    let space_list_lock = CACHE.get_or_init(init_spaces).await;

    {
        let space_list = space_list_lock.load();
        if !space_list.spaces.is_empty() && space_list.instant.elapsed().as_secs() < 10 {
            return Ok(space_list.spaces.clone());
        }
    }
    let pool = db::get().await;
    let spaces = Space::all(&pool).await?;
    let space_list = SpaceList {
        spaces: spaces.clone(),
        instant: std::time::Instant::now(),
    };
    space_list_lock.store(std::sync::Arc::new(space_list));
    Ok(spaces)
}

async fn query(req: Request<impl Body>) -> Result<Space, AppError> {
    let QuerySpace { id, token } = parse_query(req.uri())?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let space = Space::get_by_id(&mut *conn, &id).await?.or_not_found()?;
    if space.is_public || space.allow_spectator {
        return Ok(space);
    }
    if let Some(token) = token {
        if token == space.invite_token {
            return Ok(space);
        }
    }
    let session = authenticate(&req).await?;
    let Some(_) = SpaceMember::get(&mut *conn, &session.user_id, &id).await? else {
        return Err(AppError::NoPermission(
            "A non-member tries to query space".to_string(),
        ));
    };
    Ok(space)
}

pub async fn space_related(id: &Uuid) -> Result<SpaceWithRelated, AppError> {
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let space = Space::get_by_id(&mut *conn, id).await?.or_not_found()?;
    let members = SpaceMemberWithUser::get_by_space(&mut *conn, id).await?;
    let channels = Channel::get_by_space(&mut *conn, id).await?;
    let users_status = space_users_status(space.id).await.unwrap_or_default();
    let mut channel_members: HashMap<Uuid, Vec<ChannelMember>> = HashMap::new();
    for channel in channels.iter() {
        let members = Member::get_by_channel(&mut *conn, space.id, channel.id).await?;
        channel_members.insert(
            channel.id,
            members.into_iter().map(|member| member.channel).collect(),
        );
    }
    Ok(SpaceWithRelated {
        space,
        members,
        channels,
        users_status,
        channel_members,
    })
}

async fn query_with_related(req: Request<impl Body>) -> Result<SpaceWithRelated, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    space_related(&id).await
}

async fn token(req: Request<impl Body>) -> Result<Uuid, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let is_admin = SpaceMember::get(&mut *conn, &session.user_id, &id)
        .await?
        .map(|space_member| space_member.is_admin)
        .unwrap_or(false);
    if !is_admin {
        return Err(AppError::NoPermission(
            "A non-admin tries to get join token".to_string(),
        ));
    }
    Space::get_token(&mut *conn, &id).await.map_err(Into::into)
}

async fn refresh_token(req: Request<impl Body>) -> Result<Uuid, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let is_admin = SpaceMember::get(&mut *conn, &session.user_id, &id)
        .await?
        .map(|space_member| space_member.is_admin)
        .unwrap_or(false);
    if !is_admin {
        return Err(AppError::NoPermission(
            "A non-admin tries to refresh join token".to_string(),
        ));
    }
    Space::refresh_token(&mut *conn, &id)
        .await
        .map_err(Into::into)
}

async fn my_spaces(req: Request<impl Body>) -> Result<Vec<SpaceWithMember>, AppError> {
    let session = authenticate(&req).await?;
    Space::get_by_user(&db::get().await, &session.user_id)
        .await
        .map_err(Into::into)
}

async fn search(req: Request<impl Body>) -> Result<Vec<Space>, AppError> {
    let SearchParams { search } = parse_query(req.uri()).unwrap();
    let pool = db::get().await;
    Space::search(&pool, search).await.map_err(Into::into)
}

async fn create(req: Request<impl Body>) -> Result<SpaceWithMember, AppError> {
    let session = authenticate(&req).await?;
    let CreateSpace {
        name,
        password,
        description,
        default_dice_type,
        first_channel_name,
        first_channel_type,
    }: CreateSpace = interface::parse_body(req).await?;

    let pool = db::get().await;
    let mut trans = pool.begin().await?;
    let default_dice_type = default_dice_type.as_deref();
    let user = User::get_by_id(&pool, &session.user_id)
        .await?
        .ok_or(AppError::NotFound("user"))?;
    let space = Space::create(
        &mut *trans,
        name,
        &user.id,
        description,
        password,
        default_dice_type,
    )
    .await?;
    let member = SpaceMember::add_admin(&mut *trans, &user.id, &space.id).await?;
    let _type = first_channel_type.unwrap_or(ChannelType::OutOfGame);
    let channel = Channel::create(
        &mut *trans,
        &space.id,
        &first_channel_name,
        true,
        default_dice_type,
        _type,
    )
    .await?;
    assert_eq!(channel.r#type, _type);
    ChannelMember::add_user(&mut *trans, user.id, channel.id, channel.space_id, "", true).await?;
    trans.commit().await?;
    log::info!("a space ({}) was just created", space.id);
    Ok(SpaceWithMember {
        space,
        member,
        user,
    })
}

async fn edit(req: Request<impl Body>) -> Result<Space, AppError> {
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

    let pool = db::get().await;
    let mut trans = pool.begin().await?;

    let space_member = SpaceMember::get(&mut *trans, &session.user_id, &space_id)
        .await
        .or_no_permission()?;
    if !space_member.is_admin {
        return Err(AppError::NoPermission(
            "A non-admin tries to edit space".to_string(),
        ));
    }
    let space = Space::edit(
        &mut *trans,
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
            SpaceMember::set_admin(&mut *trans, &space_id, user_id, true).await?;
        }
        for user_id in remove_admins.iter() {
            if user_id != &space.owner_id {
                SpaceMember::set_admin(&mut *trans, &space_id, user_id, false).await?;
            }
        }
    }
    trans.commit().await?;

    Update::space_updated(space_id);
    Ok(space)
}

async fn join(req: Request<impl Body>) -> Result<SpaceWithMember, AppError> {
    let session = authenticate(&req).await?;
    let JoinSpace { space_id, token } = parse_query(req.uri())?;

    let pool = db::get().await;
    let mut conn = pool.acquire().await?;

    let space = Space::get_by_id(&mut *conn, &space_id)
        .await?
        .or_not_found()?;
    if !space.is_public && token != Some(space.invite_token) && space.owner_id != session.user_id {
        return Err(AppError::NoPermission(
            "A user tries to join group without token".to_string(),
        ));
    }
    let user_id = &session.user_id;
    let user = User::get_by_id(&mut *conn, user_id)
        .await?
        .ok_or_else(|| unexpected!("No such user found."))?;
    let member = if &space.owner_id == user_id {
        SpaceMember::add_admin(&mut *conn, user_id, &space_id).await?
    } else {
        SpaceMember::add_user(&mut *conn, user_id, &space_id).await?
    };
    Update::space_updated(space_id);
    Ok(SpaceWithMember {
        space,
        member,
        user,
    })
}

async fn leave(req: Request<impl Body>) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;

    let pool = db::get().await;
    let mut trans = pool.begin().await?;
    SpaceMember::remove_user(&mut trans, session.user_id, id).await?;
    trans.commit().await?;
    Update::space_updated(id);
    Ok(true)
}

async fn kick(req: Request<impl Body>) -> Result<HashMap<Uuid, SpaceMemberWithUser>, AppError> {
    let session = authenticate(&req).await?;
    let KickFromSpace { space_id, user_id } = parse_query(req.uri())?;

    let pool = db::get().await;
    let mut trans = pool.begin().await?;
    let my_member = SpaceMember::get(&mut *trans, &session.user_id, &space_id)
        .await
        .or_not_found()?;
    let kick_member = SpaceMember::get(&mut *trans, &user_id, &space_id)
        .await
        .or_not_found()?;
    if kick_member.is_admin {
        return Err(AppError::BadRequest("Can't kick admin".to_string()));
    }
    if !my_member.is_admin {
        return Err(AppError::NoPermission(
            "A non-admin tries to kick".to_string(),
        ));
    }
    SpaceMember::remove_user(&mut trans, user_id, space_id).await?;
    trans.commit().await?;
    Update::space_updated(space_id);
    Ok(SpaceMemberWithUser::get_by_space(&pool, &space_id).await?)
}

async fn my_space_member(req: Request<impl Body>) -> Result<Option<SpaceMember>, AppError> {
    let session = if let Ok(session) = authenticate(&req).await {
        session
    } else {
        return Ok(None);
    };
    let IdQuery { id } = parse_query(req.uri())?;
    let pool = db::get().await;
    let mut db = pool.acquire().await?;
    SpaceMember::get(&mut *db, &session.user_id, &id)
        .await
        .map_err(Into::into)
}

async fn members(req: Request<impl Body>) -> Result<HashMap<Uuid, SpaceMemberWithUser>, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    SpaceMemberWithUser::get_by_space(&mut *conn, &id)
        .await
        .map_err(Into::into)
}

async fn users_status(req: Request<impl Body>) -> Result<StatusMap, AppError> {
    let IdQuery { id: space_id } = parse_query(req.uri())?;
    // TODO: permission check
    let users_status = space_users_status(space_id).await.unwrap_or_default();
    Ok(users_status)
}

async fn delete(req: Request<impl Body>) -> Result<Space, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let session = authenticate(&req).await?;
    let space = Space::get_by_id(&mut *conn, &id).await.or_not_found()?;
    if space.owner_id == session.user_id {
        Space::delete(&mut *conn, id).await?;
        log::info!("A space ({}) was deleted", space.id);
        return Ok(space);
    }
    log::warn!(
        "The user {} failed to try delete a space {}",
        session.user_id,
        space.id
    );
    Err(AppError::NoPermission("failed to delete".to_string()))
}

async fn space_settings(req: Request<impl Body>) -> Result<serde_json::Value, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    // TODO: check whether the user is a member of the space
    let extension = Space::get_settings(&mut *conn, id).await?;
    Ok(extension)
}

async fn update_settings(req: Request<impl Body>) -> Result<serde_json::Value, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let settings: serde_json::Value = interface::parse_body(req).await?;
    if !settings.is_object() {
        return Err(AppError::BadRequest("Invalid settings".to_string()));
    }
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;

    let is_admin = SpaceMember::get(&mut *conn, &session.user_id, &id)
        .await?
        .map(|space_member| space_member.is_admin)
        .unwrap_or(false);
    if !is_admin {
        return Err(AppError::NoPermission(
            "A non-admin tries to update settings".to_string(),
        ));
    }
    Space::put_settings(&mut *conn, id, &settings).await?;
    Ok(settings)
}

pub async fn router(req: Request<impl Body>, path: &str) -> Result<Response, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/list", Method::GET) => list(req).await.map(ok_response),
        ("/query", Method::GET) => query(req).await.map(ok_response),
        ("/users_status", Method::GET) => users_status(req).await.map(ok_response),
        ("/query_with_related", Method::GET) => query_with_related(req).await.map(ok_response),
        ("/settings", Method::GET) => space_settings(req).await.map(ok_response),
        ("/update_settings", Method::POST) => update_settings(req).await.map(ok_response),
        ("/update_settings", Method::PUT) => update_settings(req).await.map(ok_response),
        ("/token", Method::GET) => token(req).await.map(ok_response),
        ("/refresh_token", Method::POST) => refresh_token(req).await.map(ok_response),
        ("/my", Method::GET) => my_spaces(req).await.map(ok_response),
        ("/search", Method::GET) => search(req).await.map(ok_response),
        ("/create", Method::POST) => create(req).await.map(ok_response),
        ("/edit", Method::POST) => edit(req).await.map(ok_response),
        ("/join", Method::POST) => join(req).await.map(ok_response),
        ("/leave", Method::POST) => leave(req).await.map(ok_response),
        ("/kick", Method::POST) => kick(req).await.map(ok_response),
        ("/my_space_member", Method::GET) => my_space_member(req).await.map(ok_response),
        ("/members", Method::GET) => members(req).await.map(ok_response),
        ("/delete", Method::POST) => delete(req).await.map(ok_response),
        _ => missing(),
    }
}
