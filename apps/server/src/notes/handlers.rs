use super::api::{ArchiveNote, CreateNote, EditNote, ListNotes, QueryNote, RestoreNote};
use super::models::{Note, NoteContentRevision, NoteMetadata};
use crate::committed_changes::CommittedChanges;
use crate::csrf::{authenticate, authenticate_optional};
use crate::error::{AppError, Find};
use crate::interface::{missing, parse_body, parse_query, response};
use crate::spaces::{ResourceAccessContext, resolve_resource_access_context, resolve_space_access};
use hyper::Request;
use hyper::body::Body;
use uuid::Uuid;

pub(crate) async fn can_view_note(
    ctx: &crate::context::AppContext,
    note: &NoteMetadata,
    user_id: Option<Uuid>,
) -> Result<bool, AppError> {
    let context =
        resolve_resource_access_context(ctx, note.space_id, note.access_channel_id, user_id)
            .await?;
    Ok(can_view_note_with_context(note, user_id, context))
}

pub(crate) async fn can_edit_note(
    ctx: &crate::context::AppContext,
    note: &NoteMetadata,
    user_id: Uuid,
) -> Result<bool, AppError> {
    let context =
        resolve_resource_access_context(ctx, note.space_id, note.access_channel_id, Some(user_id))
            .await?;
    Ok(can_edit_note_with_context(note, user_id, context))
}

fn can_edit_note_with_context(
    note: &NoteMetadata,
    user_id: Uuid,
    context: ResourceAccessContext,
) -> bool {
    note.access_policy
        .can_edit(note.creator_id, user_id, context)
}

fn can_view_note_with_context(
    note: &NoteMetadata,
    user_id: Option<Uuid>,
    context: ResourceAccessContext,
) -> bool {
    note.access_policy
        .can_view(note.creator_id, user_id, context)
}

fn can_view_note_content_revisions_with_context(
    note: &NoteMetadata,
    user_id: Option<Uuid>,
    context: ResourceAccessContext,
) -> bool {
    user_id.is_some_and(|user_id| can_edit_note_with_context(note, user_id, context))
}

async fn create(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Note, AppError> {
    let session = authenticate(&req).await?;
    let payload: CreateNote = parse_body(req).await?;
    let mutation = ctx.space_store.acquire_mutation(payload.space_id).await?;
    let access = resolve_space_access(ctx, payload.space_id, Some(session.user_id)).await?;
    if !access.is_member {
        return Err(AppError::NoPermission(
            "Only space members can create notes".to_string(),
        ));
    }
    let target_context = resolve_resource_access_context(
        ctx,
        payload.space_id,
        payload.access_channel_id,
        Some(session.user_id),
    )
    .await?;
    if !payload
        .access_policy
        .can_edit(Some(session.user_id), session.user_id, target_context)
    {
        return Err(AppError::NoPermission(
            "You cannot edit notes with this access policy and context".to_string(),
        ));
    }
    let mut transaction = ctx.db.begin().await?;
    let note = Note::create(
        &mut transaction,
        payload.space_id,
        payload.title,
        payload.keywords,
        payload.tags,
        session.user_id,
        payload.text,
        payload.entities,
        payload.access_policy,
        payload.access_channel_id,
    )
    .await?;
    let mutation = mutation.commit(transaction).await?;
    let mut changes = CommittedChanges::default();
    changes.note_updated(&note.metadata);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(note)
}

async fn edit(ctx: &crate::context::AppContext, req: Request<impl Body>) -> Result<Note, AppError> {
    let session = authenticate(&req).await?;
    let payload: EditNote = parse_body(req).await?;
    let mutation = ctx.space_store.acquire_mutation(payload.space_id).await?;
    let note = ctx
        .space_store
        .resolve_note_metadata(payload.space_id, payload.note_id)
        .await?
        .or_not_found()?;
    if !can_edit_note(ctx, &note, session.user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to edit this note".to_string(),
        ));
    }
    let target_context = resolve_resource_access_context(
        ctx,
        payload.space_id,
        payload.access_channel_id,
        Some(session.user_id),
    )
    .await?;
    if !payload
        .access_policy
        .can_edit(note.creator_id, session.user_id, target_context)
    {
        return Err(AppError::NoPermission(
            "You cannot edit notes with this access policy and context".to_string(),
        ));
    }
    let mut transaction = ctx.db.begin().await?;
    let updated = Note::update(
        &mut transaction,
        payload.space_id,
        note.id,
        payload.expected_revision,
        payload.title,
        payload.keywords,
        payload.tags,
        payload.text,
        payload.entities,
        payload.access_policy,
        payload.access_channel_id,
        session.user_id,
    )
    .await?
    .ok_or_else(|| AppError::Conflict("Note revision is stale".to_string()))?;
    let mutation = mutation.commit(transaction).await?;
    let mut changes = CommittedChanges::default();
    changes.note_updated(&updated.metadata);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(updated)
}

async fn archive(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let payload: ArchiveNote = parse_body(req).await?;
    let mutation = ctx.space_store.acquire_mutation(payload.space_id).await?;
    let note = ctx
        .space_store
        .resolve_note_metadata(payload.space_id, payload.note_id)
        .await?
        .or_not_found()?;
    if !can_edit_note(ctx, &note, session.user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to archive this note".to_string(),
        ));
    }
    let mut transaction = ctx.db.begin().await?;
    if !Note::archive(
        &mut transaction,
        payload.space_id,
        note.id,
        payload.expected_revision,
    )
    .await?
    {
        return Err(AppError::Conflict("Note revision is stale".to_string()));
    }
    let updated = NoteMetadata::get_by_id(&mut *transaction, payload.space_id, note.id)
        .await?
        .or_not_found()?;
    let mutation = mutation.commit(transaction).await?;
    let mut changes = CommittedChanges::default();
    changes.note_updated(&updated);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(true)
}

async fn restore(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let payload: RestoreNote = parse_body(req).await?;
    let mutation = ctx.space_store.acquire_mutation(payload.space_id).await?;
    let note = ctx
        .space_store
        .resolve_note_metadata(payload.space_id, payload.note_id)
        .await?
        .or_not_found()?;
    if !can_edit_note(ctx, &note, session.user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to restore this note".to_string(),
        ));
    }
    let mut transaction = ctx.db.begin().await?;
    if !Note::restore(
        &mut transaction,
        payload.space_id,
        note.id,
        payload.expected_revision,
    )
    .await?
    {
        return Err(AppError::Conflict(
            "Note revision is stale or note is not archived".to_string(),
        ));
    }
    let updated = NoteMetadata::get_by_id(&mut *transaction, payload.space_id, note.id)
        .await?
        .or_not_found()?;
    let mutation = mutation.commit(transaction).await?;
    let mut changes = CommittedChanges::default();
    changes.note_updated(&updated);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(true)
}

async fn query(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Note, AppError> {
    let session = authenticate_optional(&req).await?;
    let QueryNote { space_id, note_id } = parse_query(req.uri())?;
    let note = Note::get_by_id(&ctx.db, space_id, note_id)
        .await?
        .or_not_found()?;
    let user_id = session.map(|session| session.user_id);
    if !can_view_note(ctx, &note, user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to view this note".to_string(),
        ));
    }
    Ok(note)
}

async fn by_space(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<NoteMetadata>, AppError> {
    let session = authenticate_optional(&req).await?;
    let ListNotes {
        space_id,
        include_archived,
    } = parse_query(req.uri())?;
    let user_id = session.map(|session| session.user_id);
    let access = resolve_space_access(ctx, space_id, user_id).await?;
    if !access.can_access {
        return Err(AppError::NoPermission(
            "You don't have permission to view this space".to_string(),
        ));
    }
    let notes = ctx
        .space_store
        .list_note_metadata(space_id, include_archived)
        .await?;
    let mut visible = Vec::with_capacity(notes.len());
    for note in notes {
        if can_view_note(ctx, &note, user_id).await? {
            visible.push(note);
        }
    }
    Ok(visible)
}

async fn content_revisions(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<NoteContentRevision>, AppError> {
    let session = authenticate_optional(&req).await?;
    let QueryNote { space_id, note_id } = parse_query(req.uri())?;
    let note = ctx
        .space_store
        .resolve_note_metadata(space_id, note_id)
        .await?
        .or_not_found()?;
    let user_id = session.map(|session| session.user_id);
    let context =
        resolve_resource_access_context(ctx, note.space_id, note.access_channel_id, user_id)
            .await?;
    if !can_view_note_content_revisions_with_context(&note, user_id, context) {
        return Err(AppError::NoPermission(
            "You don't have permission to view these note content revisions".to_string(),
        ));
    }
    NoteContentRevision::list_by_note(&ctx.db, &note_id)
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
        ("/edit", Method::PUT) => response(edit(ctx, req).await).await,
        ("/archive", Method::POST) => response(archive(ctx, req).await).await,
        ("/restore", Method::POST) => response(restore(ctx, req).await).await,
        ("/content_revisions", Method::GET) => response(content_revisions(ctx, req).await).await,
        _ => missing(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::spaces::AccessPolicy;
    use chrono::Utc;
    use compact_str::CompactString;

    fn note(creator_id: Uuid, access_policy: AccessPolicy) -> NoteMetadata {
        let now = Utc::now();
        NoteMetadata {
            id: Uuid::now_v7(),
            space_id: Uuid::now_v7(),
            title: CompactString::new(""),
            keywords: Vec::new(),
            tags: Vec::new(),
            creator_id: Some(creator_id),
            access_policy,
            access_channel_id: None,
            revision: 1,
            archived_at: None,
            created: now,
            modified: now,
        }
    }

    fn context(is_member: bool, can_manage: bool) -> ResourceAccessContext {
        ResourceAccessContext {
            can_view: true,
            is_member,
            is_game_master: false,
            can_manage,
        }
    }

    #[test]
    fn former_member_loses_note_creator_permissions() {
        let creator_id = Uuid::new_v4();
        let former_member_context = context(false, false);
        let mut note = note(creator_id, AccessPolicy::Secret);

        assert!(!can_view_note_with_context(
            &note,
            Some(creator_id),
            former_member_context,
        ));
        assert!(!can_edit_note_with_context(
            &note,
            creator_id,
            former_member_context,
        ));
        assert!(!can_view_note_content_revisions_with_context(
            &note,
            Some(creator_id),
            former_member_context,
        ));

        note.access_policy = AccessPolicy::Public;
        assert!(can_view_note_with_context(
            &note,
            Some(creator_id),
            former_member_context,
        ));
        assert!(!can_edit_note_with_context(
            &note,
            creator_id,
            former_member_context,
        ));
        assert!(!can_view_note_content_revisions_with_context(
            &note,
            Some(creator_id),
            former_member_context,
        ));
    }

    #[test]
    fn secret_and_personal_notes_are_hidden_from_administrators() {
        let creator_id = Uuid::new_v4();
        let admin_id = Uuid::new_v4();
        let admin_context = context(true, true);

        for policy in [AccessPolicy::Personal, AccessPolicy::Secret] {
            let note = note(creator_id, policy);
            assert!(!can_view_note_with_context(
                &note,
                Some(admin_id),
                admin_context,
            ));
            assert!(!can_edit_note_with_context(&note, admin_id, admin_context,));
        }
    }
}
