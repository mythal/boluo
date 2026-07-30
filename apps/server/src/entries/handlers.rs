use super::api::{
    CheckEntryIdentifier, CreateEntry, DeleteEntry, EditEntry, EditEntryComponents,
    EntryComponentHistoryQuery, EntryHistoryQuery, ListEntries, QueryEntry,
};
use super::models::{
    Entry, EntryComponentHistory, EntryHistory, EntryHistoryAction, EntryMetadata,
    components_as_set_changes,
};
use crate::committed_changes::CommittedChanges;
use crate::csrf::{authenticate, authenticate_optional};
use crate::error::{AppError, Find};
use crate::interface::{missing, parse_body, parse_query, response};
use crate::scopes::models::Scope;
use crate::spaces::resolve_resource_access_context;
use hyper::Request;
use hyper::body::Body;
use uuid::Uuid;

pub(crate) async fn can_view_scope(
    ctx: &crate::context::AppContext,
    scope: &Scope,
    user_id: Option<Uuid>,
) -> Result<bool, AppError> {
    let context =
        resolve_resource_access_context(ctx, scope.space_id, scope.access_channel_id, user_id)
            .await?;
    Ok(scope.can_view(user_id, context))
}

pub(crate) async fn can_edit_scope(
    ctx: &crate::context::AppContext,
    scope: &Scope,
    user_id: Uuid,
) -> Result<bool, AppError> {
    let context = resolve_resource_access_context(
        ctx,
        scope.space_id,
        scope.access_channel_id,
        Some(user_id),
    )
    .await?;
    Ok(scope.can_edit(user_id, context))
}

async fn resolve_scope(
    ctx: &crate::context::AppContext,
    space_id: Uuid,
    scope_id: Uuid,
) -> Result<Scope, AppError> {
    ctx.space_store
        .resolve_scope(space_id, scope_id)
        .await?
        .or_not_found()
}

async fn ensure_reference_access(
    ctx: &crate::context::AppContext,
    scope: &Scope,
    note_id: Option<Uuid>,
    user_id: Uuid,
) -> Result<(), AppError> {
    let Some(note_id) = note_id else {
        return Ok(());
    };
    let note = ctx
        .space_store
        .resolve_note_metadata(scope.space_id, note_id)
        .await?
        .or_not_found()?;
    if !crate::notes::handlers::can_view_note(ctx, &note, Some(user_id)).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to use this reference note".to_string(),
        ));
    }
    Ok(())
}

async fn list_entries(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<EntryMetadata>, AppError> {
    let session = authenticate_optional(&req).await?;
    let ListEntries { space_id, scope_id } = parse_query(req.uri())?;
    let scope = resolve_scope(ctx, space_id, scope_id).await?;
    if !can_view_scope(ctx, &scope, session.map(|session| session.user_id)).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to view these entries".to_string(),
        ));
    }
    ctx.space_store
        .list_entry_metadata(space_id, scope_id)
        .await
        .map_err(Into::into)
}

async fn query_entry(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Entry, AppError> {
    let session = authenticate_optional(&req).await?;
    let QueryEntry {
        space_id,
        scope_id,
        entry_id,
    } = parse_query(req.uri())?;
    let scope = resolve_scope(ctx, space_id, scope_id).await?;
    if !can_view_scope(ctx, &scope, session.map(|session| session.user_id)).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to view this entry".to_string(),
        ));
    }
    ctx.space_store
        .resolve_entry(space_id, scope_id, entry_id)
        .await?
        .or_not_found()
}

async fn create_entry(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Entry, AppError> {
    let session = authenticate(&req).await?;
    let payload: CreateEntry = parse_body(req).await?;
    let mutation = ctx.space_store.acquire_mutation(payload.space_id).await?;
    let scope = resolve_scope(ctx, payload.space_id, payload.scope_id).await?;
    if !can_edit_scope(ctx, &scope, session.user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to edit this scope".to_string(),
        ));
    }
    ensure_reference_access(ctx, &scope, payload.reference_note_id, session.user_id).await?;
    let mut transaction = ctx.db.begin().await?;
    let entry = Entry::create(
        &mut transaction,
        payload.scope_id,
        payload.key,
        payload.aliases,
        payload.display_name,
        payload.reference_note_id,
        payload.components,
        payload.tags,
        payload.sort,
    )
    .await?;
    let operation_id = Uuid::now_v7();
    EntryHistory::record(
        &mut transaction,
        operation_id,
        Some(session.user_id),
        entry.scope_id,
        entry.id,
        payload.source_message_id,
        &entry.key,
        EntryHistoryAction::Create,
    )
    .await?;
    EntryComponentHistory::record(
        &mut transaction,
        operation_id,
        Some(session.user_id),
        entry.scope_id,
        entry.id,
        payload.source_message_id,
        &entry.key,
        &components_as_set_changes(&entry.components),
    )
    .await?;
    let mutation = mutation.commit(transaction).await?;
    let mut changes = CommittedChanges::default();
    changes.entry_updated(payload.space_id, &entry.metadata);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(entry)
}

async fn edit_entry(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Entry, AppError> {
    let session = authenticate(&req).await?;
    let payload: EditEntry = parse_body(req).await?;
    let mutation = ctx.space_store.acquire_mutation(payload.space_id).await?;
    let scope = resolve_scope(ctx, payload.space_id, payload.scope_id).await?;
    if !can_edit_scope(ctx, &scope, session.user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to edit this entry".to_string(),
        ));
    }
    ensure_reference_access(ctx, &scope, payload.reference_note_id, session.user_id).await?;
    let mut transaction = ctx.db.begin().await?;
    let previous = EntryMetadata::get_by_id_for_update(&mut transaction, payload.entry_id)
        .await?
        .filter(|entry| entry.scope_id == payload.scope_id)
        .or_not_found()?;
    if previous.metadata_version != payload.expected_metadata_version {
        return Err(AppError::Conflict(
            "Entry metadata version is stale".to_string(),
        ));
    }
    let entry = Entry::update(
        &mut transaction,
        payload.scope_id,
        payload.entry_id,
        payload.expected_metadata_version,
        payload.key,
        payload.aliases,
        payload.display_name,
        payload.reference_note_id,
        payload.tags,
        payload.sort,
    )
    .await?
    .or_not_found()?;
    if previous.key.to_lowercase() != entry.key.to_lowercase() {
        EntryHistory::record_rename(
            &mut transaction,
            Uuid::now_v7(),
            Some(session.user_id),
            entry.scope_id,
            entry.id,
            payload.source_message_id,
            &previous.key,
            &entry.key,
        )
        .await?;
    }
    let mutation = mutation.commit(transaction).await?;
    let mut changes = CommittedChanges::default();
    changes.entry_updated(payload.space_id, &entry.metadata);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(entry)
}

async fn edit_entry_components(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Entry, AppError> {
    let session = authenticate(&req).await?;
    let payload: EditEntryComponents = parse_body(req).await?;
    let mutation = ctx.space_store.acquire_mutation(payload.space_id).await?;
    let scope = resolve_scope(ctx, payload.space_id, payload.scope_id).await?;
    if !can_edit_scope(ctx, &scope, session.user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to edit this entry".to_string(),
        ));
    }

    let mut transaction = ctx.db.begin().await?;
    let entry = EntryMetadata::get_by_id_for_update(&mut transaction, payload.entry_id)
        .await?
        .filter(|entry| entry.scope_id == payload.scope_id)
        .or_not_found()?;
    let history_changes =
        Entry::apply_component_mutations(&mut transaction, entry.id, &payload.changes).await?;
    let operation_id = Uuid::now_v7();
    EntryComponentHistory::record(
        &mut transaction,
        operation_id,
        Some(session.user_id),
        entry.scope_id,
        entry.id,
        payload.source_message_id,
        &entry.key,
        &history_changes,
    )
    .await?;
    let entry = Entry::get_by_id_in_transaction(&mut transaction, entry.scope_id, entry.id)
        .await?
        .or_not_found()?;
    let mutation = mutation.commit(transaction).await?;
    let mut changes = CommittedChanges::default();
    changes.entry_updated(payload.space_id, &entry.metadata);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(entry)
}

async fn delete_entry(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let payload: DeleteEntry = parse_body(req).await?;
    let mutation = ctx.space_store.acquire_mutation(payload.space_id).await?;
    let scope = resolve_scope(ctx, payload.space_id, payload.scope_id).await?;
    if !can_edit_scope(ctx, &scope, session.user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to edit this scope".to_string(),
        ));
    }
    let mut transaction = ctx.db.begin().await?;
    let entry = EntryMetadata::get_by_id_for_update(&mut transaction, payload.entry_id)
        .await?
        .filter(|entry| entry.scope_id == payload.scope_id)
        .or_not_found()?;
    if entry.metadata_version != payload.expected_metadata_version {
        return Err(AppError::Conflict(
            "Entry metadata version is stale".to_string(),
        ));
    }
    let operation_id = Uuid::now_v7();
    EntryHistory::record(
        &mut transaction,
        operation_id,
        Some(session.user_id),
        entry.scope_id,
        entry.id,
        payload.source_message_id,
        &entry.key,
        EntryHistoryAction::Delete,
    )
    .await?;
    if !Entry::delete(
        &mut transaction,
        payload.scope_id,
        payload.entry_id,
        payload.expected_metadata_version,
    )
    .await?
    {
        return Err(AppError::Conflict(
            "Entry metadata version is stale".to_string(),
        ));
    }
    let mutation = mutation.commit(transaction).await?;
    let mut changes = CommittedChanges::default();
    changes.entry_deleted(payload.space_id, entry.scope_id, entry.id);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(true)
}

async fn history(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<EntryHistory>, AppError> {
    let session = authenticate_optional(&req).await?;
    let EntryHistoryQuery {
        space_id,
        scope_id,
        entry_id,
    } = parse_query(req.uri())?;
    let scope = resolve_scope(ctx, space_id, scope_id).await?;
    if !can_view_scope(ctx, &scope, session.map(|session| session.user_id)).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to view this history".to_string(),
        ));
    }
    EntryHistory::list_by_scope(&ctx.db, scope_id, entry_id)
        .await
        .map_err(Into::into)
}

async fn component_history(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<EntryComponentHistory>, AppError> {
    let session = authenticate_optional(&req).await?;
    let EntryComponentHistoryQuery {
        space_id,
        scope_id,
        entry_id,
        key,
    } = parse_query(req.uri())?;
    let scope = resolve_scope(ctx, space_id, scope_id).await?;
    if !can_view_scope(ctx, &scope, session.map(|session| session.user_id)).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to view this history".to_string(),
        ));
    }
    match (entry_id, key) {
        (Some(entry_id), None) => EntryComponentHistory::list_by_entry(&ctx.db, scope_id, entry_id)
            .await
            .map_err(Into::into),
        (None, Some(key)) => EntryComponentHistory::list_by_key(&ctx.db, scope_id, &key)
            .await
            .map_err(Into::into),
        _ => Err(AppError::BadRequest(
            "Exactly one of entryId or key is required".to_string(),
        )),
    }
}

async fn check_identifier(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate_optional(&req).await?;
    let payload: CheckEntryIdentifier = parse_query(req.uri())?;
    let scope = resolve_scope(ctx, payload.space_id, payload.scope_id).await?;
    if !can_view_scope(ctx, &scope, session.map(|session| session.user_id)).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to view this scope".to_string(),
        ));
    }
    Ok(
        !Entry::exists_identifier(&ctx.db, payload.scope_id, Some(&payload.identifier), &[])
            .await?,
    )
}

pub async fn router(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
    path: &str,
) -> Result<hyper::Response<Vec<u8>>, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/by_scope", Method::GET) => response(list_entries(ctx, req).await).await,
        ("/query", Method::GET) => response(query_entry(ctx, req).await).await,
        ("/check_identifier", Method::GET) => response(check_identifier(ctx, req).await).await,
        ("/create", Method::POST) => response(create_entry(ctx, req).await).await,
        ("/edit", Method::PUT) => response(edit_entry(ctx, req).await).await,
        ("/components", Method::PATCH) => response(edit_entry_components(ctx, req).await).await,
        ("/delete", Method::POST) => response(delete_entry(ctx, req).await).await,
        ("/history", Method::GET) => response(history(ctx, req).await).await,
        ("/component_history", Method::GET) => response(component_history(ctx, req).await).await,
        _ => missing(),
    }
}
