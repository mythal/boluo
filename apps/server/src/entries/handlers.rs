use super::api::{
    CheckEntryIdentifier, CreateEntry, DeleteEntry, EditEntry, EditEntryComponents,
    EntryComponentHistoryQuery, EntryHistoryQuery, ListEntries, ListEntriesByComponent, MoveEntry,
    QueryEntry, QueryEntryEffectsByMessages,
};
use super::models::{
    Entry, EntryComponentHistory, EntryComponentMatch, EntryEffect, EntryEffectHistory,
    EntryHistory, EntryHistoryAction, EntryMetadata, MessageEntryEffects,
    components_as_set_history_changes,
};
use crate::committed_changes::CommittedChanges;
use crate::csrf::{authenticate, authenticate_optional};
use crate::error::{AppError, Find};
use crate::events::Update;
use crate::interface::{missing, parse_body, parse_query, response};
use crate::messages::Message;
use crate::scopes::models::Scope;
use crate::spaces::resolve_resource_access_context;
use hyper::Request;
use hyper::body::Body;
use std::collections::HashMap;
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

async fn attach_message(
    transaction: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    message_id: Option<Uuid>,
    user_id: Uuid,
    entry_effect_id: Uuid,
) -> Result<Option<Message>, AppError> {
    let Some(message_id) = message_id else {
        return Ok(None);
    };
    let message = Message::attach_entry_effect(transaction, message_id, user_id, entry_effect_id)
        .await?
        .ok_or_else(|| {
            AppError::NoPermission(
                "The message cannot be associated with this Entry Effect".to_string(),
            )
        })?;
    Ok(Some(message))
}

async fn publish_attached_message(space_id: Uuid, message: Option<Message>) {
    if let Some(message) = message {
        let old_pos = message.pos;
        Update::message_edited(space_id, message, old_pos).await;
    }
}

async fn list_entries(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<EntryMetadata>, AppError> {
    let session = authenticate_optional(ctx, &req).await?;
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

async fn list_entries_by_component(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<EntryComponentMatch>, AppError> {
    let session = authenticate_optional(ctx, &req).await?;
    let ListEntriesByComponent {
        space_id,
        scope_id,
        component_type,
    } = parse_query(req.uri())?;
    let scope = resolve_scope(ctx, space_id, scope_id).await?;
    if !can_view_scope(ctx, &scope, session.map(|session| session.user_id)).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to view these entries".to_string(),
        ));
    }
    Entry::list_by_component(&ctx.db, scope_id, &component_type)
        .await
        .map_err(Into::into)
}

async fn query_entry(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Entry, AppError> {
    let session = authenticate_optional(ctx, &req).await?;
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
    let session = authenticate(ctx, &req).await?;
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
        payload.before_entry_id,
    )
    .await?;
    let effect = EntryEffect::create(
        &mut transaction,
        payload.space_id,
        entry.scope_id,
        session.user_id,
    )
    .await?;
    EntryHistory::record(
        &mut transaction,
        effect.id,
        entry.id,
        &entry.key,
        EntryHistoryAction::Create,
    )
    .await?;
    EntryComponentHistory::record(
        &mut transaction,
        effect.id,
        entry.id,
        &entry.key,
        &components_as_set_history_changes(&entry.components),
    )
    .await?;
    let attached_message = attach_message(
        &mut transaction,
        payload.message_id,
        session.user_id,
        effect.id,
    )
    .await?;
    let mutation = mutation.commit(transaction).await?;
    let mut changes = CommittedChanges::default();
    changes.entry_updated(payload.space_id, &entry.metadata);
    changes.apply_with_mutation(ctx, &mutation).await;
    publish_attached_message(payload.space_id, attached_message).await;
    Ok(entry)
}

async fn edit_entry(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Entry, AppError> {
    let session = authenticate(ctx, &req).await?;
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
    )
    .await?
    .or_not_found()?;
    let renamed = previous.key.to_lowercase() != entry.key.to_lowercase();
    if payload.message_id.is_some() && !renamed {
        return Err(AppError::BadRequest(
            "messageId requires a recorded Entry change".to_string(),
        ));
    }
    let attached_message = if renamed {
        let effect = EntryEffect::create(
            &mut transaction,
            payload.space_id,
            entry.scope_id,
            session.user_id,
        )
        .await?;
        EntryHistory::record_rename(
            &mut transaction,
            effect.id,
            entry.id,
            &previous.key,
            &entry.key,
        )
        .await?;
        attach_message(
            &mut transaction,
            payload.message_id,
            session.user_id,
            effect.id,
        )
        .await?
    } else {
        None
    };
    let mutation = mutation.commit(transaction).await?;
    let mut changes = CommittedChanges::default();
    changes.entry_updated(payload.space_id, &entry.metadata);
    changes.apply_with_mutation(ctx, &mutation).await;
    publish_attached_message(payload.space_id, attached_message).await;
    Ok(entry)
}

async fn move_entry(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Entry, AppError> {
    let session = authenticate(ctx, &req).await?;
    let payload: MoveEntry = parse_body(req).await?;
    let mutation = ctx.space_store.acquire_mutation(payload.space_id).await?;
    let scope = resolve_scope(ctx, payload.space_id, payload.scope_id).await?;
    if !can_edit_scope(ctx, &scope, session.user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to move this entry".to_string(),
        ));
    }
    let mut transaction = ctx.db.begin().await?;
    let entry = Entry::move_before(
        &mut transaction,
        payload.scope_id,
        payload.entry_id,
        payload.expected_metadata_version,
        payload.before_entry_id,
    )
    .await?
    .ok_or_else(|| AppError::Conflict("Entry metadata version is stale".to_string()))?;
    let mutation = mutation.commit(transaction).await?;
    let mut changes = CommittedChanges::default();
    changes.entry_updated(payload.space_id, &entry.metadata);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(entry)
}

async fn edit_entry_components(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Option<Entry>, AppError> {
    let session = authenticate(ctx, &req).await?;
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
    let mutation_result =
        Entry::apply_component_mutations(&mut transaction, entry.id, &payload.changes).await?;
    if payload.skip_record_history && payload.message_id.is_some() {
        return Err(AppError::BadRequest(
            "messageId requires Component history".to_string(),
        ));
    }
    let updated_entry = Entry::get_by_id_in_transaction(&mut transaction, entry.scope_id, entry.id)
        .await?
        .or_not_found()?;
    let delete_empty_entry = updated_entry.components.is_empty() && !payload.keep_empty_entry;
    let attached_message = if payload.skip_record_history {
        None
    } else {
        let effect = EntryEffect::create(
            &mut transaction,
            payload.space_id,
            entry.scope_id,
            session.user_id,
        )
        .await?;
        EntryComponentHistory::record(
            &mut transaction,
            effect.id,
            entry.id,
            &entry.key,
            &mutation_result.history_changes,
        )
        .await?;
        if delete_empty_entry {
            EntryHistory::record(
                &mut transaction,
                effect.id,
                entry.id,
                &entry.key,
                EntryHistoryAction::Delete,
            )
            .await?;
        }
        attach_message(
            &mut transaction,
            payload.message_id,
            session.user_id,
            effect.id,
        )
        .await?
    };
    if delete_empty_entry
        && !Entry::delete(
            &mut transaction,
            entry.scope_id,
            entry.id,
            entry.metadata_version,
        )
        .await?
    {
        return Err(AppError::Conflict(
            "Entry metadata version is stale".to_string(),
        ));
    }
    let mutation = mutation.commit(transaction).await?;
    let mut changes = CommittedChanges::default();
    if delete_empty_entry {
        changes.entry_deleted(payload.space_id, entry.scope_id, entry.id);
    } else {
        changes.entry_updated(payload.space_id, &updated_entry.metadata);
    }
    changes.apply_with_mutation(ctx, &mutation).await;
    publish_attached_message(payload.space_id, attached_message).await;
    Ok((!delete_empty_entry).then_some(updated_entry))
}

async fn delete_entry(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(ctx, &req).await?;
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
    let effect = EntryEffect::create(
        &mut transaction,
        payload.space_id,
        entry.scope_id,
        session.user_id,
    )
    .await?;
    EntryHistory::record(
        &mut transaction,
        effect.id,
        entry.id,
        &entry.key,
        EntryHistoryAction::Delete,
    )
    .await?;
    let attached_message = attach_message(
        &mut transaction,
        payload.message_id,
        session.user_id,
        effect.id,
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
    publish_attached_message(payload.space_id, attached_message).await;
    Ok(true)
}

async fn visible_effect_history(
    ctx: &crate::context::AppContext,
    mut effects: Vec<EntryEffect>,
    user_id: Option<Uuid>,
) -> Result<Vec<EntryEffectHistory>, AppError> {
    let mut visible_effects = Vec::with_capacity(effects.len());
    for effect in effects.drain(..) {
        let scope = resolve_scope(ctx, effect.space_id, effect.scope_id).await?;
        if can_view_scope(ctx, &scope, user_id).await? {
            visible_effects.push(effect);
        }
    }

    let effect_ids = visible_effects
        .iter()
        .map(|effect| effect.id)
        .collect::<Vec<_>>();
    if effect_ids.is_empty() {
        return Ok(Vec::new());
    }
    let entry_history = EntryHistory::list_by_effects(&ctx.db, &effect_ids).await?;
    let component_history = EntryComponentHistory::list_by_effects(&ctx.db, &effect_ids).await?;
    let mut entries_by_effect: HashMap<Uuid, Vec<EntryHistory>> = HashMap::new();
    for history in entry_history {
        entries_by_effect
            .entry(history.entry_effect_id)
            .or_default()
            .push(history);
    }
    let mut components_by_effect: HashMap<Uuid, Vec<EntryComponentHistory>> = HashMap::new();
    for history in component_history {
        components_by_effect
            .entry(history.entry_effect_id)
            .or_default()
            .push(history);
    }

    Ok(visible_effects
        .into_iter()
        .map(|effect| {
            let effect_id = effect.id;
            EntryEffectHistory {
                effect,
                entry_history: entries_by_effect.remove(&effect_id).unwrap_or_default(),
                component_history: components_by_effect.remove(&effect_id).unwrap_or_default(),
            }
        })
        .collect())
}

async fn effects_by_messages(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<MessageEntryEffects>, AppError> {
    const MAX_MESSAGES: usize = 256;

    let session = authenticate_optional(ctx, &req).await?;
    let payload: QueryEntryEffectsByMessages = parse_body(req).await?;
    if payload.message_ids.is_empty() || payload.message_ids.len() > MAX_MESSAGES {
        return Err(AppError::BadRequest(format!(
            "messageIds must contain between 1 and {MAX_MESSAGES} IDs"
        )));
    }

    let effects =
        EntryEffect::list_by_message_ids(&ctx.db, payload.space_id, &payload.message_ids).await?;
    let user_id = session.map(|session| session.user_id);
    let visible_effects = visible_effect_history(ctx, effects, user_id).await?;
    let mut effects_by_message: HashMap<Uuid, Vec<EntryEffectHistory>> = HashMap::new();
    for effect in visible_effects {
        if let Some(message_id) = effect.effect.message_id {
            effects_by_message
                .entry(message_id)
                .or_default()
                .push(effect);
        }
    }

    let mut seen = std::collections::HashSet::with_capacity(payload.message_ids.len());
    Ok(payload
        .message_ids
        .into_iter()
        .filter(|message_id| seen.insert(*message_id))
        .filter_map(|message_id| {
            effects_by_message
                .remove(&message_id)
                .map(|effects| MessageEntryEffects {
                    message_id,
                    effects,
                })
        })
        .collect())
}

async fn history(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<EntryHistory>, AppError> {
    let session = authenticate_optional(ctx, &req).await?;
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
    let session = authenticate_optional(ctx, &req).await?;
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
    let session = authenticate_optional(ctx, &req).await?;
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
        ("/by_component", Method::GET) => response(list_entries_by_component(ctx, req).await).await,
        ("/query", Method::GET) => response(query_entry(ctx, req).await).await,
        ("/check_identifier", Method::GET) => response(check_identifier(ctx, req).await).await,
        ("/create", Method::POST) => response(create_entry(ctx, req).await).await,
        ("/edit", Method::PUT) => response(edit_entry(ctx, req).await).await,
        ("/move", Method::PUT) => response(move_entry(ctx, req).await).await,
        ("/components", Method::PATCH) => response(edit_entry_components(ctx, req).await).await,
        ("/delete", Method::POST) => response(delete_entry(ctx, req).await).await,
        ("/history", Method::GET) => response(history(ctx, req).await).await,
        ("/component_history", Method::GET) => response(component_history(ctx, req).await).await,
        ("/effects_by_messages", Method::POST) => {
            response(effects_by_messages(ctx, req).await).await
        }
        _ => missing(),
    }
}
