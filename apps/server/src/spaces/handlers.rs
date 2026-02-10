use std::collections::HashMap;

use super::api::{CreateSpace, EditSpace, QuerySpace, SpaceWithRelated};
use super::{Space, SpaceMember};
use crate::channels::models::Member;
use crate::channels::{Channel, ChannelMember, ChannelType};
use crate::csrf::authenticate;
use crate::error::{AppError, Find};
use crate::events::models::space_users_status;
use crate::events::{StatusMap, Update};
use crate::interface::{self, IdQuery, Response, missing, ok_response, parse_query, response};
use crate::spaces::api::{JoinSpace, KickFromSpace, SearchParams, SpaceWithMember};
use crate::spaces::models::SpaceMemberWithUser;
use crate::users::User;
use arc_swap::ArcSwap;
use hyper::Request;
use hyper::body::Body;
use uuid::Uuid;

async fn list(
    ctx: &crate::context::AppContext,
    _req: Request<impl Body>,
) -> Result<Vec<Space>, AppError> {
    struct SpaceList {
        spaces: Vec<Space>,
        instant: std::time::Instant,
    }
    async fn init_spaces(ctx: &crate::context::AppContext) -> ArcSwap<SpaceList> {
        let spaces = Space::all(&ctx.db).await.unwrap_or_default();
        ArcSwap::new(std::sync::Arc::new(SpaceList {
            spaces,
            instant: std::time::Instant::now(),
        }))
    }

    // Intentional short-window local cache for `/spaces/list`.
    // We do not actively invalidate this on create/edit/delete; callers can
    // observe up to ~10s staleness in exchange for lower read pressure.
    static CACHE: tokio::sync::OnceCell<ArcSwap<SpaceList>> = tokio::sync::OnceCell::const_new();
    let space_list_lock = CACHE.get_or_init(|| init_spaces(ctx)).await;

    {
        let space_list = space_list_lock.load();
        if !space_list.spaces.is_empty() && space_list.instant.elapsed().as_secs() < 10 {
            return Ok(space_list.spaces.clone());
        }
    }
    let spaces = Space::all(&ctx.db).await?;
    let space_list = SpaceList {
        spaces: spaces.clone(),
        instant: std::time::Instant::now(),
    };
    space_list_lock.store(std::sync::Arc::new(space_list));
    Ok(spaces)
}

async fn query(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Space, AppError> {
    let QuerySpace { id, token } = parse_query(req.uri())?;
    let space = Space::get_by_id(&ctx.db, &id).await?.or_not_found()?;
    if space.is_public || space.allow_spectator {
        return Ok(space);
    }
    if let Some(token) = token {
        if token == space.invite_token {
            return Ok(space);
        }
    }
    let session = authenticate(&req).await?;
    let Some(_) = SpaceMember::get(&ctx.db, &session.user_id, &id).await? else {
        tracing::warn!(
            space_id = %id,
            user_id = %session.user_id,
            "A non-member tries to query space"
        );
        return Err(AppError::NoPermission(
            "You are not a member of this space".to_string(),
        ));
    };
    Ok(space)
}

pub async fn space_related(
    ctx: &crate::context::AppContext,
    id: &Uuid,
) -> Result<SpaceWithRelated, AppError> {
    let mut conn = ctx.db.acquire().await?;
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

async fn query_with_related(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<SpaceWithRelated, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    space_related(ctx, &id).await
}

async fn token(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Uuid, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let is_admin = SpaceMember::get(&mut *conn, &session.user_id, &id)
        .await?
        .map(|space_member| space_member.is_admin)
        .unwrap_or(false);
    if !is_admin {
        tracing::warn!(
            space_id = %id,
            user_id = %session.user_id,
            "A non-admin tries to get invitation token"
        );
        return Err(AppError::NoPermission(
            "Only admins can get space invitation token".to_string(),
        ));
    }
    Space::get_token(&mut *conn, &id).await.map_err(Into::into)
}

async fn refresh_token(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Uuid, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let is_admin = SpaceMember::get(&mut *conn, &session.user_id, &id)
        .await?
        .map(|space_member| space_member.is_admin)
        .unwrap_or(false);
    if !is_admin {
        tracing::warn!(
            space_id = %id,
            user_id = %session.user_id,
            "A non-admin tries to refresh invitation token"
        );
        return Err(AppError::NoPermission(
            "Only admins can refresh space invitation token".to_string(),
        ));
    }
    Space::refresh_token(&mut *conn, &id)
        .await
        .map_err(Into::into)
}

async fn my_spaces(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<SpaceWithMember>, AppError> {
    let session = authenticate(&req).await?;
    let mut conn = ctx.db.acquire().await?;
    Space::get_by_user(&mut conn, session.user_id)
        .await
        .map_err(Into::into)
}

async fn search(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<Space>, AppError> {
    let SearchParams { search } = parse_query(req.uri()).unwrap();
    Space::search(&ctx.db, search).await.map_err(Into::into)
}

async fn create(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<SpaceWithMember, AppError> {
    let session = authenticate(&req).await?;
    let CreateSpace {
        name,
        password,
        description,
        default_dice_type,
        first_channel_name,
        first_channel_type,
    }: CreateSpace = interface::parse_body(req).await?;

    let mut trans = ctx.db.begin().await?;
    let default_dice_type = default_dice_type.as_deref();
    let user = User::get_by_id(&mut *trans, &session.user_id)
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
    tracing::info!(space_id = %space.id, creator = %user.id, "A space ({}) was just created", space.name);
    Ok(SpaceWithMember {
        space,
        member,
        user,
    })
}

async fn edit(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Space, AppError> {
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

    let mut trans = ctx.db.begin().await?;

    let Some(space) = Space::get_by_id(&mut *trans, &space_id).await? else {
        return Err(AppError::NotFound("space"));
    };

    let space_member = SpaceMember::get(&mut *trans, &session.user_id, &space_id)
        .await
        .or_no_permission()?;
    if !space_member.is_admin && space.owner_id != session.user_id {
        tracing::warn!(
            space_id = %space_id,
            user_id = %session.user_id,
            "A non-admin tries to edit space"
        );
        return Err(AppError::NoPermission(
            "Only admins can edit space".to_string(),
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
            SpaceMember::set_admin(&mut *trans, user_id, &space_id, true).await?;
        }
        for user_id in remove_admins.iter() {
            if user_id != &space.owner_id {
                SpaceMember::set_admin(&mut *trans, user_id, &space_id, false).await?;
            }
        }
    }
    trans.commit().await?;

    Update::space_updated(ctx, space_id);
    Ok(space)
}

async fn join(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<SpaceWithMember, AppError> {
    let session = authenticate(&req).await?;
    let JoinSpace { space_id, token } = parse_query(req.uri())?;

    let mut conn = ctx.db.acquire().await?;

    let space = Space::get_by_id(&mut *conn, &space_id)
        .await?
        .or_not_found()?;
    if !space.is_public && token != Some(space.invite_token) && space.owner_id != session.user_id {
        tracing::warn!(
            space_id = %space_id,
            user_id = %session.user_id,
            "A user tries to join group without token"
        );
        return Err(AppError::NoPermission(
            "You have no permission to join this space".to_string(),
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
    Update::space_updated(ctx, space_id);
    Ok(SpaceWithMember {
        space,
        member,
        user,
    })
}

async fn leave(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;

    let mut trans = ctx.db.begin().await?;
    SpaceMember::remove_user(&mut trans, session.user_id, id).await?;
    trans.commit().await?;
    Update::space_updated(ctx, id);
    Ok(true)
}

async fn kick(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<HashMap<Uuid, SpaceMemberWithUser>, AppError> {
    let session = authenticate(&req).await?;
    let KickFromSpace { space_id, user_id } = parse_query(req.uri())?;

    let mut trans = ctx.db.begin().await?;
    let Some(space) = Space::get_by_id(&mut *trans, &space_id).await? else {
        return Err(AppError::NotFound("space"));
    };
    let my_member = SpaceMember::get(&mut *trans, &session.user_id, &space_id)
        .await
        .or_not_found()?;
    let member_to_kick = SpaceMember::get(&mut *trans, &user_id, &space_id)
        .await
        .or_not_found()?;
    if member_to_kick.is_admin && space.owner_id != session.user_id {
        return Err(AppError::BadRequest("Can't kick admin".to_string()));
    }
    if !my_member.is_admin && space.owner_id != session.user_id {
        tracing::warn!(
            space_id = %space_id,
            user_id = %session.user_id,
            "A non-admin tries to kick"
        );
        return Err(AppError::NoPermission(
            "Only admins can kick members".to_string(),
        ));
    }
    SpaceMember::remove_user(&mut trans, user_id, space_id).await?;
    trans.commit().await?;
    Update::space_updated(ctx, space_id);
    Ok(SpaceMemberWithUser::get_by_space(&ctx.db, &space_id).await?)
}

async fn my_space_member(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Option<SpaceMember>, AppError> {
    let session = if let Ok(session) = authenticate(&req).await {
        session
    } else {
        return Ok(None);
    };
    let IdQuery { id } = parse_query(req.uri())?;
    let my_space_members = SpaceMember::get_by_user(&ctx.db, session.user_id).await?;
    Ok(my_space_members
        .into_iter()
        .find(|space_member| space_member.space_id == id))
}

async fn members(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<HashMap<Uuid, SpaceMemberWithUser>, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
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

async fn delete(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Space, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    let session = authenticate(&req).await?;
    let mut conn = ctx.db.acquire().await?;
    let space = Space::get_by_id(&mut *conn, &id).await.or_not_found()?;
    if space.owner_id == session.user_id {
        Space::delete(&mut conn, id).await?;
        tracing::info!("A space ({}) was deleted", space.id);
        return Ok(space);
    }
    tracing::warn!(
        "The user {} failed to try delete a space {}",
        session.user_id,
        space.id
    );
    Err(AppError::NoPermission(
        "You are not the owner of this space".to_string(),
    ))
}

async fn space_settings(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<serde_json::Value, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    // TODO: check whether the user is a member of the space
    let extension = Space::get_settings(&ctx.db, id).await?;
    Ok(extension)
}

async fn update_settings(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<serde_json::Value, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let settings: serde_json::Value = interface::parse_body(req).await?;
    if !settings.is_object() {
        return Err(AppError::BadRequest("Invalid settings".to_string()));
    }
    let mut conn = ctx.db.acquire().await?;

    let Some(space) = Space::get_by_id(&mut *conn, &id).await? else {
        return Err(AppError::NotFound("space"));
    };

    let is_admin = SpaceMember::get(&mut *conn, &session.user_id, &id)
        .await?
        .map(|space_member| space_member.is_admin)
        .unwrap_or(false);
    if !is_admin && space.owner_id != session.user_id {
        tracing::warn!(
            space_id = %id,
            user_id = %session.user_id,
            "A non-admin tries to update settings"
        );
        return Err(AppError::NoPermission(
            "Only admins can update space settings".to_string(),
        ));
    }
    Space::put_settings(&mut *conn, id, &settings).await?;
    Ok(settings)
}

pub async fn router(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
    path: &str,
) -> Result<Response, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/list", Method::GET) => response(list(ctx, req).await).await,
        ("/query", Method::GET) => response(query(ctx, req).await).await,
        ("/users_status", Method::GET) => response(users_status(req).await).await,
        ("/query_with_related", Method::GET) => response(query_with_related(ctx, req).await).await,
        ("/settings", Method::GET) => space_settings(ctx, req).await.map(ok_response),
        ("/update_settings", Method::POST) => update_settings(ctx, req).await.map(ok_response),
        ("/update_settings", Method::PUT) => update_settings(ctx, req).await.map(ok_response),
        ("/token", Method::GET) => token(ctx, req).await.map(ok_response),
        ("/refresh_token", Method::POST) => refresh_token(ctx, req).await.map(ok_response),
        ("/my", Method::GET) => response(my_spaces(ctx, req).await).await,
        ("/search", Method::GET) => response(search(ctx, req).await).await,
        ("/create", Method::POST) => response(create(ctx, req).await).await,
        ("/edit", Method::POST) => response(edit(ctx, req).await).await,
        ("/join", Method::POST) => response(join(ctx, req).await).await,
        ("/leave", Method::POST) => leave(ctx, req).await.map(ok_response),
        ("/kick", Method::POST) => response(kick(ctx, req).await).await,
        ("/my_space_member", Method::GET) => response(my_space_member(ctx, req).await).await,
        ("/members", Method::GET) => response(members(ctx, req).await).await,
        ("/delete", Method::POST) => response(delete(ctx, req).await).await,
        _ => missing(),
    }
}
