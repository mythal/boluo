use std::collections::HashMap;

use super::api::{CreateSpace, EditSpace, QuerySpace, SpaceWithRelated};
use super::{Space, SpaceMember};
use crate::channels::models::Member;
use crate::channels::{Channel, ChannelMember, ChannelType};
use crate::committed_changes::CommittedChanges;
use crate::csrf::authenticate;
use crate::error::{AppError, Find};
use crate::events::models::space_users_status;
use crate::events::{StatusMap, Update};
use crate::interface::{self, IdQuery, Response, missing, ok_response, parse_query, response};
use crate::rate_limit;
use crate::spaces::api::{JoinSpace, KickFromSpace, SearchParams, SpaceWithMember};
use crate::spaces::models::SpaceMemberWithUser;
use crate::users::User;
use arc_swap::ArcSwap;
use governor::{DefaultKeyedRateLimiter, RateLimiter};
use hyper::Request;
use hyper::body::Body;
use std::sync::LazyLock;
use uuid::Uuid;

static CREATE_SPACE_LIMITER: LazyLock<DefaultKeyedRateLimiter<Uuid>> = LazyLock::new(|| {
    RateLimiter::keyed(rate_limit::per_hour(rate_limit::CREATE_SPACE_USER_PER_HOUR))
});

pub fn start_rate_limiter_cleanup() {
    rate_limit::start_cleanup_task(
        || {
            CREATE_SPACE_LIMITER.retain_recent();
        },
        || {
            CREATE_SPACE_LIMITER.shrink_to_fit();
        },
    );
}

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
    let snapshot = ctx
        .space_store
        .authoritative_snapshot(id)
        .await
        .ok()
        .flatten();
    let space = if let Some(snapshot) = &snapshot {
        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit").increment(1);
        snapshot.space()
    } else {
        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "fallback")
            .increment(1);
        Space::get_by_id(&ctx.db, &id).await?.or_not_found()?
    };
    if space.is_public || space.allow_spectator {
        return Ok(space);
    }
    if let Some(token) = token {
        if token == space.invite_token {
            return Ok(space);
        }
    }
    let session = authenticate(&req).await?;
    let is_member = if let Some(snapshot) = snapshot {
        snapshot.space_members.contains_key(&session.user_id)
    } else {
        SpaceMember::get(&ctx.db, &session.user_id, &id)
            .await?
            .is_some()
    };
    if !is_member {
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
    if let Ok(Some(snapshot)) = ctx.space_store.authoritative_snapshot(*id).await {
        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit").increment(1);
        let mut users =
            User::get_by_id_list(&ctx.db, snapshot.space_members.keys().copied()).await?;
        let members = snapshot
            .space_members
            .values()
            .filter_map(|member| {
                users.remove(&member.user_id).map(|user| {
                    (
                        member.user_id,
                        SpaceMemberWithUser {
                            space: member.clone(),
                            user,
                        },
                    )
                })
            })
            .collect();
        let mut channels: Vec<_> = snapshot.channels.values().cloned().collect();
        channels.sort_unstable_by_key(|channel| channel.created);
        let channel_members = snapshot
            .channel_members
            .iter()
            .map(|(channel_id, members)| {
                let mut members: Vec<_> = members.values().cloned().collect();
                members.sort_unstable_by_key(|member| member.join_date);
                (*channel_id, members)
            })
            .collect();
        let users_status = space_users_status(snapshot.space().id)
            .await
            .unwrap_or_default();
        return Ok(SpaceWithRelated {
            space: snapshot.space(),
            members,
            channels,
            users_status,
            channel_members,
        });
    }
    metrics::counter!("boluo_server_space_runtime_read_total", "result" => "fallback").increment(1);
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
    if let Some(snapshot) = ctx
        .space_store
        .loaded_authoritative_snapshot_after_wait(id)
        .await
    {
        let is_admin = snapshot
            .space_members
            .get(&session.user_id)
            .is_some_and(|member| member.is_admin);
        if !is_admin {
            return Err(AppError::NoPermission(
                "Only admins can get space invitation token".to_string(),
            ));
        }
        return Ok(snapshot.space().invite_token);
    }
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
    let mutation = ctx.space_store.acquire_mutation(id).await?;
    let mut trans = ctx.db.begin().await?;
    let is_admin = SpaceMember::get(&mut *trans, &session.user_id, &id)
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
    let token = Space::refresh_token(&mut *trans, &id).await?;
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.space_invite_token_updated(id, token);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(token)
}

async fn my_spaces(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<SpaceWithMember>, AppError> {
    let session = authenticate(&req).await?;
    let members = SpaceMember::get_by_user_with_cache(&ctx.db, session.user_id).await?;
    let Some(user) = User::get_by_id_with_cache(&ctx.db, &session.user_id).await? else {
        return Ok(Vec::new());
    };
    let mut loaded = HashMap::new();
    let mut missing = Vec::new();
    for member in &members {
        if let Some(snapshot) = ctx.space_store.loaded_snapshot_maybe_stale(member.space_id)
            && let Some(snapshot_member) = snapshot.space_members.get(&session.user_id)
        {
            loaded.insert(member.space_id, (snapshot.space(), snapshot_member.clone()));
        } else {
            missing.push(member.space_id);
        }
    }
    let mut spaces = if missing.is_empty() {
        HashMap::new()
    } else {
        Space::get_by_id_list(&ctx.db, missing.into_iter()).await?
    };
    Ok(members
        .into_iter()
        .filter_map(|member| {
            let (space, member) = loaded
                .remove(&member.space_id)
                .or_else(|| spaces.remove(&member.space_id).map(|space| (space, member)))?;
            Some(SpaceWithMember {
                space,
                member,
                user: user.clone(),
            })
        })
        .collect())
}

async fn search(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<Space>, AppError> {
    let SearchParams { search } = parse_query(req.uri()).unwrap();
    Space::search(&ctx.db, search).await.map_err(Into::into)
}

async fn create_transactional<F>(
    ctx: &crate::context::AppContext,
    user_id: Uuid,
    payload: CreateSpace,
    before_commit: F,
) -> Result<SpaceWithMember, AppError>
where
    F: std::future::Future<Output = ()>,
{
    let CreateSpace {
        name,
        password,
        description,
        default_dice_type,
        first_channel_name,
        first_channel_type,
    } = payload;

    let mut trans = ctx.db.begin().await?;
    let default_dice_type = default_dice_type.as_deref();
    let user = User::get_by_id(&mut *trans, &user_id)
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
    let channel_member =
        ChannelMember::add_user(&mut *trans, user.id, channel.id, "", true).await?;
    before_commit.await;
    trans.commit().await?;
    let mut changes = CommittedChanges::default();
    changes.space_created(&space);
    changes.space_member_added(&member);
    changes.channel_created(&channel);
    changes.channel_member_added(space.id, &channel_member);
    changes.apply_with_context(ctx).await;
    tracing::info!(space_id = %space.id, creator = %user.id, "A space ({}) was just created", space.name);
    Ok(SpaceWithMember {
        space,
        member,
        user,
    })
}

async fn create(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<SpaceWithMember, AppError> {
    let session = authenticate(&req).await?;
    CREATE_SPACE_LIMITER
        .check_key(&session.user_id)
        .map_err(|_| AppError::LimitExceeded("Too many spaces, please try again later."))?;
    let payload = interface::parse_body::<CreateSpace>(req).await?;
    create_transactional(ctx, session.user_id, payload, std::future::ready(())).await
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

    let mutation = ctx.space_store.acquire_mutation(space_id).await?;
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

    let mut changed_members = Vec::new();
    if space.owner_id == session.user_id {
        for user_id in grant_admins.iter() {
            if let Some(member) =
                SpaceMember::set_admin(&mut *trans, user_id, &space_id, true).await?
            {
                changed_members.push(member);
            }
        }
        for user_id in remove_admins.iter() {
            if user_id != &space.owner_id {
                if let Some(member) =
                    SpaceMember::set_admin(&mut *trans, user_id, &space_id, false).await?
                {
                    changed_members.push(member);
                }
            }
        }
    }
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.space_updated(&space);
    for member in &changed_members {
        changes.space_member_changed(member);
    }
    changes.apply_with_mutation(ctx, &mutation).await;

    Update::space_updated(ctx, space_id);
    Ok(space)
}

async fn join(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<SpaceWithMember, AppError> {
    let session = authenticate(&req).await?;
    let JoinSpace { space_id, token } = parse_query(req.uri())?;
    let user_id = &session.user_id;
    let user = User::get_by_id_with_cache(&ctx.db, user_id)
        .await?
        .ok_or_else(|| unexpected!("No such user found."))?;

    let mutation = ctx.space_store.acquire_mutation(space_id).await?;
    let mut trans = ctx.db.begin().await?;

    let space = Space::get_by_id(&mut *trans, &space_id)
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
    let member = if &space.owner_id == user_id {
        SpaceMember::add_admin(&mut *trans, user_id, &space_id).await?
    } else {
        SpaceMember::add_user(&mut *trans, user_id, &space_id).await?
    };
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.space_member_added(&member);
    changes.apply_with_mutation(ctx, &mutation).await;
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

    let mutation = ctx.space_store.acquire_mutation(id).await?;
    let mut trans = ctx.db.begin().await?;
    let channel_ids = SpaceMember::remove_user(&mut trans, session.user_id, id).await?;
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.space_member_removed(id, session.user_id, channel_ids);
    changes.apply_with_mutation(ctx, &mutation).await;
    Update::space_updated(ctx, id);
    Ok(true)
}

async fn kick(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<HashMap<Uuid, SpaceMemberWithUser>, AppError> {
    let session = authenticate(&req).await?;
    let KickFromSpace { space_id, user_id } = parse_query(req.uri())?;

    let mutation = ctx.space_store.acquire_mutation(space_id).await?;
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
    let channel_ids = SpaceMember::remove_user(&mut trans, user_id, space_id).await?;
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.space_member_removed(space_id, user_id, channel_ids);
    changes.apply_with_mutation(ctx, &mutation).await;
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
    if let Some(snapshot) = ctx.space_store.loaded_snapshot_maybe_stale(id) {
        return Ok(snapshot.space_members.get(&session.user_id).cloned());
    }
    let my_space_members = SpaceMember::get_by_user_with_cache(&ctx.db, session.user_id).await?;
    Ok(my_space_members
        .into_iter()
        .find(|space_member| space_member.space_id == id))
}

async fn members(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<HashMap<Uuid, SpaceMemberWithUser>, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    if let Some(snapshot) = ctx.space_store.loaded_snapshot_maybe_stale(id) {
        let mut users =
            User::get_by_id_list(&ctx.db, snapshot.space_members.keys().copied()).await?;
        return Ok(snapshot
            .space_members
            .values()
            .filter_map(|member| {
                users.remove(&member.user_id).map(|user| {
                    (
                        member.user_id,
                        SpaceMemberWithUser {
                            space: member.clone(),
                            user,
                        },
                    )
                })
            })
            .collect());
    }
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
    let mutation = ctx.space_store.acquire_mutation(id).await?;
    let mut trans = ctx.db.begin().await?;
    let space = Space::get_by_id(&mut *trans, &id).await.or_not_found()?;
    if space.owner_id == session.user_id {
        let member_user_ids = Space::delete(&mut trans, id)
            .await?
            .ok_or(AppError::NotFound("space"))?;
        let mutation = mutation.commit(trans).await?;
        let mut changes = CommittedChanges::default();
        changes.space_deleted(id, member_user_ids);
        changes.apply_with_mutation(ctx, &mutation).await;
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
    if let Some(snapshot) = ctx.space_store.loaded_snapshot_maybe_stale(id) {
        return Ok(snapshot.settings.clone());
    }
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
    let mutation = ctx.space_store.acquire_mutation(id).await?;
    let mut trans = ctx.db.begin().await?;

    let Some(space) = Space::get_by_id(&mut *trans, &id).await? else {
        return Err(AppError::NotFound("space"));
    };

    let is_admin = SpaceMember::get(&mut *trans, &session.user_id, &id)
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
    Space::put_settings(&mut *trans, id, &settings).await?;
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.space_settings_updated(id, settings.clone());
    changes.apply_with_mutation(ctx, &mutation).await;
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::context::AppContext;

    async fn create_test_user(pool: &sqlx::PgPool) -> User {
        let raw = Uuid::new_v4().simple().to_string();
        let username = format!("space_handler_{}", &raw[..8]);
        let email = format!("space_handler_{raw}@example.com");
        User::register(
            pool,
            &email,
            &username,
            "Space Handler Tester",
            "SpaceHandlerPass123!",
        )
        .await
        .expect("failed to create test user")
    }

    async fn create_test_space(pool: &sqlx::PgPool, owner: &User) -> Space {
        let raw = Uuid::new_v4().simple().to_string();
        let space = Space::create(
            pool,
            format!("space_handler_{}", &raw[..8]),
            &owner.id,
            "Space handler test space".to_string(),
            None,
            Some("d20"),
        )
        .await
        .expect("failed to create test space");
        SpaceMember::add_admin(pool, &owner.id, &space.id)
            .await
            .expect("failed to grant owner admin");
        space
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_created_space_is_visible_after_transaction_commit(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool).await;
        let initial_spaces = SpaceMember::get_by_user_with_cache(&pool, owner.id)
            .await
            .expect("failed to prime user spaces cache");
        assert!(initial_spaces.is_empty());

        let (reached_before_commit_tx, reached_before_commit_rx) = tokio::sync::oneshot::channel();
        let (continue_commit_tx, continue_commit_rx) = tokio::sync::oneshot::channel();
        let ctx = AppContext::new(pool.clone(), None);
        let payload = CreateSpace {
            name: format!(
                "space_handler_{}",
                &Uuid::new_v4().simple().to_string()[..8]
            ),
            password: None,
            description: "Space handler transaction test".to_string(),
            default_dice_type: Some("d20".to_string()),
            first_channel_name: "First Channel".to_string(),
            first_channel_type: Some(ChannelType::OutOfGame),
        };
        let create_task = tokio::spawn(async move {
            create_transactional(&ctx, owner.id, payload, async move {
                reached_before_commit_tx
                    .send(())
                    .expect("test receiver was dropped");
                continue_commit_rx
                    .await
                    .expect("commit release sender was dropped");
            })
            .await
        });

        reached_before_commit_rx
            .await
            .expect("space creation did not reach the commit barrier");
        let before_commit = SpaceMember::get_by_user_with_cache(&pool, owner.id)
            .await
            .expect("failed to reload user spaces before commit");
        assert!(
            before_commit.is_empty(),
            "another connection observed an uncommitted space membership"
        );

        continue_commit_tx
            .send(())
            .expect("space creation task was dropped");
        let created = create_task
            .await
            .expect("space creation task panicked")
            .expect("space creation failed");
        let after_commit = SpaceMember::get_by_user_with_cache(&pool, owner.id)
            .await
            .expect("failed to load user spaces after commit");
        assert!(
            after_commit
                .iter()
                .any(|member| member.space_id == created.space.id),
            "the committed space was hidden by a stale user spaces cache"
        );
        let channels = Channel::get_by_space(&pool, &created.space.id)
            .await
            .expect("failed to load the first channel");
        assert_eq!(channels.len(), 1);
        let members = Member::get_by_channel(&pool, created.space.id, channels[0].id)
            .await
            .expect("failed to load first channel members");
        assert!(
            members
                .iter()
                .any(|member| member.channel.user_id == owner.id),
            "the committed channel membership was not applied to mailbox state"
        );
    }
}
