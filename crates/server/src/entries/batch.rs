use super::api::{EmptyEntryAction, EntryBatchOperation};
use super::models::{
    Entry, EntryComponentHistory, EntryEffect, EntryHistory, EntryHistoryAction, EntryMetadata,
    components_as_set_history_changes,
};
use crate::error::{AppError, Find};
use uuid::Uuid;

pub(super) struct BatchEntryChange {
    pub entry_id: Uuid,
    pub entry: Option<Entry>,
}

pub(super) async fn apply_batch(
    transaction: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    space_id: Uuid,
    scope_id: Uuid,
    user_id: Uuid,
    operations: Vec<EntryBatchOperation>,
) -> Result<(EntryEffect, Vec<BatchEntryChange>), AppError> {
    if operations.is_empty() {
        return Err(AppError::BadRequest(
            "At least one Entry operation is required".into(),
        ));
    }
    let mut seen = std::collections::HashSet::new();
    for operation in &operations {
        if let EntryBatchOperation::Update { entry_id, .. } = operation
            && !seen.insert(*entry_id)
        {
            return Err(AppError::BadRequest(
                "Each Entry may only be updated once per batch".into(),
            ));
        }
    }
    let effect = EntryEffect::create(transaction, space_id, scope_id, user_id).await?;
    let mut results = Vec::with_capacity(operations.len());
    for operation in operations {
        let result = match operation {
            EntryBatchOperation::Create {
                key,
                aliases,
                display_name,
                reference_note_id,
                components,
                tags,
                before_entry_id,
            } => {
                let entry = Entry::create(
                    transaction,
                    scope_id,
                    key,
                    aliases,
                    display_name,
                    reference_note_id,
                    components,
                    tags,
                    before_entry_id,
                )
                .await?;
                EntryHistory::record(
                    transaction,
                    effect.id,
                    entry.id,
                    &entry.key,
                    EntryHistoryAction::Create,
                )
                .await?;
                EntryComponentHistory::record(
                    transaction,
                    effect.id,
                    entry.id,
                    &entry.key,
                    &components_as_set_history_changes(&entry.components),
                )
                .await?;
                BatchEntryChange {
                    entry_id: entry.id,
                    entry: Some(entry),
                }
            }
            EntryBatchOperation::Update {
                entry_id,
                changes,
                on_empty,
            } => {
                let entry = EntryMetadata::get_by_id_for_update(transaction, entry_id)
                    .await?
                    .filter(|entry| entry.scope_id == scope_id)
                    .or_not_found()?;
                let mutation =
                    Entry::apply_component_mutations(transaction, entry_id, &changes).await?;
                EntryComponentHistory::record(
                    transaction,
                    effect.id,
                    entry_id,
                    &entry.key,
                    &mutation.history_changes,
                )
                .await?;
                let updated = Entry::get_by_id_in_transaction(transaction, scope_id, entry_id)
                    .await?
                    .or_not_found()?;
                let entry = if updated.components.is_empty() && on_empty == EmptyEntryAction::Delete
                {
                    EntryHistory::record(
                        transaction,
                        effect.id,
                        entry_id,
                        &entry.key,
                        EntryHistoryAction::Delete,
                    )
                    .await?;
                    if !Entry::delete(transaction, scope_id, entry_id, entry.metadata_version)
                        .await?
                    {
                        return Err(AppError::Conflict("Entry metadata version is stale".into()));
                    }
                    None
                } else {
                    Some(updated)
                };
                BatchEntryChange { entry_id, entry }
            }
        };
        results.push(result);
    }
    Ok((effect, results))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entries::models::{EntryComponentMutation, EntryComponentPayloadInput};
    use crate::spaces::Space;
    use crate::users::User;
    use serde_json::json;
    use std::collections::BTreeMap;

    fn create(key: &str, value: i32) -> EntryBatchOperation {
        EntryBatchOperation::Create {
            key: key.into(),
            aliases: vec![],
            display_name: String::new(),
            reference_note_id: None,
            tags: vec![],
            before_entry_id: None,
            components: BTreeMap::from([(
                "core/counter".into(),
                EntryComponentPayloadInput::json(json!({"value": value})),
            )]),
        }
    }

    fn update(entry: &Entry, version: Uuid, value: i32) -> EntryBatchOperation {
        EntryBatchOperation::Update {
            entry_id: entry.id,
            on_empty: EmptyEntryAction::Delete,
            changes: vec![EntryComponentMutation::Set {
                component_type: "core/counter".into(),
                expected_version: Some(version),
                payload: EntryComponentPayloadInput::json(json!({"value": value})),
            }],
        }
    }

    #[sqlx::test]
    async fn db_test_entry_batch_is_atomic_and_shares_one_effect(pool: sqlx::PgPool) {
        let user = User::register(
            &pool,
            "batch@example.invalid",
            "batch_test",
            "Batch",
            "password123",
        )
        .await
        .unwrap();
        let space = Space::create(
            &pool,
            "Batch test".into(),
            &user.id,
            String::new(),
            None,
            Some("d20"),
        )
        .await
        .unwrap();
        let mut tx = pool.begin().await.unwrap();
        let (effect, mut entries) = apply_batch(
            &mut tx,
            space.id,
            space.scope_id,
            user.id,
            vec![create("hp", 12), create("mp", 10)],
        )
        .await
        .unwrap();
        tx.commit().await.unwrap();
        let mp = entries.pop().unwrap().entry.unwrap();
        let hp = entries.pop().unwrap().entry.unwrap();
        for entry in [&hp, &mp] {
            let history = EntryComponentHistory::list_by_entry(&pool, space.scope_id, entry.id)
                .await
                .unwrap();
            assert_eq!(history.len(), 1);
            assert_eq!(history[0].entry_effect_id, effect.id);
        }

        // A later version conflict must undo an earlier update, creation and their histories.
        let mut tx = pool.begin().await.unwrap();
        let result = apply_batch(
            &mut tx,
            space.id,
            space.scope_id,
            user.id,
            vec![
                update(&hp, hp.components["core/counter"].version, 9),
                create("san", 60),
                update(&mp, Uuid::nil(), 8),
            ],
        )
        .await;
        assert!(matches!(result, Err(AppError::Conflict(_))));
        tx.rollback().await.unwrap();
        let mut tx = pool.begin().await.unwrap();
        let current = Entry::get_by_id_in_transaction(&mut tx, space.scope_id, hp.id)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(
            current.components["core/counter"],
            hp.components["core/counter"]
        );
        tx.rollback().await.unwrap();
        let entry_count: i64 =
            sqlx::query_scalar("SELECT count(*) FROM entries WHERE scope_id = $1")
                .bind(space.scope_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(entry_count, 2);
        let effect_count: i64 =
            sqlx::query_scalar("SELECT count(*) FROM entry_effects WHERE scope_id = $1")
                .bind(space.scope_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(effect_count, 1);
        let history = EntryComponentHistory::list_by_entry(&pool, space.scope_id, hp.id)
            .await
            .unwrap();
        assert_eq!(history.len(), 1);

        let mut tx = pool.begin().await.unwrap();
        let (_, entries) = apply_batch(
            &mut tx,
            space.id,
            space.scope_id,
            user.id,
            vec![
                update(&hp, hp.components["core/counter"].version, 9),
                EntryBatchOperation::Update {
                    entry_id: mp.id,
                    on_empty: EmptyEntryAction::Delete,
                    changes: vec![EntryComponentMutation::Remove {
                        component_type: "core/counter".into(),
                        expected_version: Some(mp.components["core/counter"].version),
                    }],
                },
            ],
        )
        .await
        .unwrap();
        tx.commit().await.unwrap();
        assert_eq!(
            entries[0].entry.as_ref().unwrap().components["core/counter"].json_data(),
            json!({"value": 9})
        );
        assert!(entries[1].entry.is_none());
    }
}
