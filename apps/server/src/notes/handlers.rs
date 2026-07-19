use super::api::{CreateNote, EditNote};
use super::models::{Note, NoteHistory, NoteVisibility};
use crate::channels::{Channel, ChannelMember};
use crate::csrf::{authenticate, authenticate_optional};
use crate::error::{AppError, Find};
use crate::interface::{IdQuery, missing, parse_body, parse_query, response};
use crate::spaces::SpaceMember;
use hyper::Request;
use hyper::body::Body;
use std::collections::HashSet;
use uuid::Uuid;

async fn filter_visible_to(
    ctx: &crate::context::AppContext,
    conn: &mut sqlx::PgConnection,
    space_id: Uuid,
    visibility: NoteVisibility,
    visible_to: Vec<Uuid>,
) -> Result<Vec<Uuid>, AppError> {
    // Both callers already perform the bounded authoritative wait before filtering.
    if let Some(snapshot) = ctx.space_store.loaded_authoritative_snapshot(space_id) {
        return Ok(match visibility {
            NoteVisibility::Users => visible_to
                .into_iter()
                .filter(|user_id| snapshot.space_members.contains_key(user_id))
                .collect(),
            NoteVisibility::Channels => visible_to
                .into_iter()
                .filter(|channel_id| snapshot.channels.contains_key(channel_id))
                .collect(),
            NoteVisibility::Private | NoteVisibility::Public => Vec::new(),
        });
    }
    match visibility {
        NoteVisibility::Users => {
            let mut filtered = Vec::new();
            for user_id in visible_to {
                if SpaceMember::get(&mut *conn, &user_id, &space_id)
                    .await?
                    .is_some()
                {
                    filtered.push(user_id);
                }
            }
            Ok(filtered)
        }
        NoteVisibility::Channels => {
            let mut filtered = Vec::new();
            for channel_id in visible_to {
                let Some(channel) = Channel::get_by_id(&mut *conn, &channel_id).await? else {
                    continue;
                };
                if channel.space_id == space_id {
                    filtered.push(channel_id);
                }
            }
            Ok(filtered)
        }
        NoteVisibility::Private | NoteVisibility::Public => Ok(Vec::new()),
    }
}

async fn can_view_note(
    ctx: &crate::context::AppContext,
    conn: &mut sqlx::PgConnection,
    note: &Note,
    user_id: Option<Uuid>,
) -> Result<bool, AppError> {
    let Some(user_id) = user_id else {
        return Ok(note.visibility == NoteVisibility::Public);
    };
    if note.owner_id == user_id {
        return Ok(true);
    }
    if let Some(snapshot) = ctx
        .space_store
        .loaded_authoritative_snapshot_after_wait(note.space_id)
        .await
    {
        return Ok(match note.visibility {
            NoteVisibility::Public => true,
            NoteVisibility::Private => false,
            NoteVisibility::Users => {
                note.visible_to.contains(&user_id) && snapshot.space_members.contains_key(&user_id)
            }
            NoteVisibility::Channels => note.visible_to.iter().any(|channel_id| {
                snapshot
                    .channel_members
                    .get(channel_id)
                    .is_some_and(|members| members.contains_key(&user_id))
            }),
        });
    }
    match note.visibility {
        NoteVisibility::Public => Ok(true),
        NoteVisibility::Private => Ok(false),
        NoteVisibility::Users => {
            if !note.visible_to.contains(&user_id) {
                return Ok(false);
            }
            let space_member = SpaceMember::get(&mut *conn, &user_id, &note.space_id).await?;
            Ok(space_member.is_some())
        }
        NoteVisibility::Channels => {
            for channel_id in &note.visible_to {
                let Some(channel) = Channel::get_by_id(&mut *conn, channel_id).await? else {
                    continue;
                };
                if channel.space_id != note.space_id {
                    continue;
                }
                if ChannelMember::get(&mut *conn, user_id, channel.space_id, channel.id)
                    .await?
                    .is_some()
                {
                    return Ok(true);
                }
            }
            Ok(false)
        }
    }
}

fn can_view_note_with_context(
    note: &Note,
    user_id: Uuid,
    is_space_member: bool,
    member_channel_ids: &HashSet<Uuid>,
) -> bool {
    if note.owner_id == user_id {
        return true;
    }
    match note.visibility {
        NoteVisibility::Public => true,
        NoteVisibility::Private => false,
        NoteVisibility::Users => is_space_member && note.visible_to.contains(&user_id),
        NoteVisibility::Channels => note
            .visible_to
            .iter()
            .any(|channel_id| member_channel_ids.contains(channel_id)),
    }
}

async fn create(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Note, AppError> {
    let session = authenticate(&req).await?;
    let CreateNote {
        space_id,
        note_type,
        title,
        keywords,
        content,
        visibility,
        visible_to,
        everyone_can_edit,
        track_history,
    } = parse_body(req).await?;
    let is_space_member = ctx
        .space_store
        .loaded_authoritative_snapshot_after_wait(space_id)
        .await
        .is_some_and(|snapshot| snapshot.space_members.contains_key(&session.user_id));
    let mut conn = ctx.db.acquire().await?;
    if !is_space_member {
        SpaceMember::get(&mut *conn, &session.user_id, &space_id)
            .await?
            .or_no_permission()?;
    }
    let visible_to = filter_visible_to(ctx, &mut conn, space_id, visibility, visible_to).await?;
    Note::create(
        &mut *conn,
        note_type,
        space_id,
        &title,
        keywords,
        session.user_id,
        &content,
        visibility,
        visible_to,
        everyone_can_edit,
        track_history,
    )
    .await
    .map_err(Into::into)
}

async fn edit(ctx: &crate::context::AppContext, req: Request<impl Body>) -> Result<Note, AppError> {
    let session = authenticate(&req).await?;
    let EditNote {
        note_id,
        note_type,
        title,
        keywords,
        content,
        visibility,
        visible_to,
        everyone_can_edit,
        track_history,
    } = parse_body(req).await?;
    let user_id = session.user_id;
    let mut trans = ctx.db.begin().await?;
    let note = Note::get_by_id(&mut *trans, &note_id)
        .await?
        .or_not_found()?;

    let is_owner = note.owner_id == user_id;
    let can_view = can_view_note(ctx, &mut trans, &note, Some(user_id)).await?;
    let can_edit = is_owner || (note.everyone_can_edit && can_view);
    if !can_edit {
        return Err(AppError::NoPermission(
            "You don't have permission to edit this note".to_string(),
        ));
    }

    let mut update_note_type = note_type;
    let mut update_visibility = visibility;
    let mut update_visible_to = visible_to;
    let mut update_everyone_can_edit = everyone_can_edit;
    let mut update_track_history = track_history;

    if !is_owner {
        update_note_type = None;
        update_visibility = None;
        update_visible_to = None;
        update_everyone_can_edit = None;
        update_track_history = None;
    }

    let filtered_visible_to = if let Some(visible_to) = update_visible_to.take() {
        let visibility = update_visibility.unwrap_or(note.visibility);
        Some(filter_visible_to(ctx, &mut trans, note.space_id, visibility, visible_to).await?)
    } else {
        None
    };

    let content_changed = match content.as_deref() {
        Some(new_content) => new_content != note.content,
        None => false,
    };
    let effective_track_history = update_track_history.unwrap_or(note.track_history);
    if content_changed && effective_track_history {
        NoteHistory::create(&mut *trans, &note_id, Some(user_id), &note.content).await?;
    }

    let updated = Note::update(
        &mut *trans,
        &note_id,
        update_note_type,
        title.as_deref(),
        keywords.as_ref(),
        content.as_deref(),
        update_visibility,
        filtered_visible_to.as_ref(),
        update_everyone_can_edit,
        update_track_history,
    )
    .await?
    .ok_or(AppError::NotFound("Note"))?;

    trans.commit().await?;
    Ok(updated)
}

async fn delete(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let note = Note::get_by_id(&mut *conn, &id).await?.or_not_found()?;
    if note.owner_id != session.user_id {
        return Err(AppError::NoPermission(
            "You don't have permission to delete this note".to_string(),
        ));
    }
    Note::delete(&mut *conn, &id).await?;
    Ok(true)
}

async fn query(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Note, AppError> {
    let session = authenticate_optional(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let note = Note::get_by_id(&mut *conn, &id).await?.or_not_found()?;
    let user_id = session.map(|session| session.user_id);
    if !can_view_note(ctx, &mut conn, &note, user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to view this note".to_string(),
        ));
    }
    Ok(note)
}

async fn by_space(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<Note>, AppError> {
    let session = authenticate_optional(&req).await?;
    let IdQuery { id: space_id } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let mut notes = Note::list_by_space(&mut *conn, &space_id).await?;

    let Some(session) = session else {
        notes.retain(|note| note.visibility == NoteVisibility::Public);
        return Ok(notes);
    };

    let user_id = session.user_id;
    let (is_space_member, member_channel_ids) = if let Some(snapshot) = ctx
        .space_store
        .loaded_authoritative_snapshot_after_wait(space_id)
        .await
    {
        let channel_ids = snapshot
            .channel_members
            .iter()
            .filter_map(|(channel_id, members)| {
                members.contains_key(&user_id).then_some(*channel_id)
            })
            .collect();
        (snapshot.space_members.contains_key(&user_id), channel_ids)
    } else {
        let is_space_member = SpaceMember::get(&mut *conn, &user_id, &space_id)
            .await?
            .is_some();
        let mut member_channel_ids = HashSet::new();
        if is_space_member {
            let channel_members = ChannelMember::get_by_user(&mut *conn, user_id).await?;
            if !channel_members.is_empty() {
                let channels = Channel::get_by_id_list(
                    &mut *conn,
                    channel_members.iter().map(|member| member.channel_id),
                )
                .await?;
                for channel in channels.values() {
                    if channel.space_id == space_id {
                        member_channel_ids.insert(channel.id);
                    }
                }
            }
        }
        (is_space_member, member_channel_ids)
    };

    notes.retain(|note| {
        can_view_note_with_context(note, user_id, is_space_member, &member_channel_ids)
    });
    Ok(notes)
}

async fn history(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<NoteHistory>, AppError> {
    let session = authenticate_optional(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let note = Note::get_by_id(&mut *conn, &id).await?.or_not_found()?;
    let user_id = session.map(|session| session.user_id);
    if !can_view_note(ctx, &mut conn, &note, user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to view this note".to_string(),
        ));
    }
    NoteHistory::get_by_note(&mut *conn, &id)
        .await
        .map_err(Into::into)
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
        ("/create", Method::POST) => response(create(ctx, req).await).await,
        ("/edit", Method::POST) => response(edit(ctx, req).await).await,
        ("/edit", Method::PUT) => response(edit(ctx, req).await).await,
        ("/delete", Method::POST) => response(delete(ctx, req).await).await,
        ("/history", Method::GET) => response(history(ctx, req).await).await,
        _ => missing(),
    }
}
