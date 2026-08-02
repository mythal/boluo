use super::api::{
    ArchiveCharacter, CheckCharacterIdentifier, CreateCharacter, EditCharacter, ListCharacters,
    QueryCharacter, RestoreCharacter,
};
use super::models::Character;
use crate::committed_changes::CommittedChanges;
use crate::csrf::{authenticate, authenticate_optional};
use crate::error::{AppError, Find};
use crate::interface::{missing, parse_body, parse_query, response};
use crate::scopes::models::Scope;
use crate::spaces::{SpaceMember, resolve_resource_access_context, resolve_space_access};
use hyper::Request;
use hyper::body::Body;
use uuid::Uuid;

pub(crate) async fn can_view_character_in_space(
    ctx: &crate::context::AppContext,
    character: &Character,
    user_id: Option<Uuid>,
) -> Result<bool, AppError> {
    let context = resolve_resource_access_context(
        ctx,
        character.space_id,
        character.access_channel_id,
        user_id,
    )
    .await?;
    Ok(character.can_view(user_id, context))
}

pub(crate) async fn can_edit_character_in_space(
    ctx: &crate::context::AppContext,
    character: &Character,
    user_id: Uuid,
) -> Result<bool, AppError> {
    let context = resolve_resource_access_context(
        ctx,
        character.space_id,
        character.access_channel_id,
        Some(user_id),
    )
    .await?;
    Ok(character.can_edit(user_id, context))
}

pub(crate) async fn resolve_character_for_portrayal(
    ctx: &crate::context::AppContext,
    space_id: Uuid,
    character_id: Uuid,
    user_id: Uuid,
) -> Result<Character, AppError> {
    let character = ctx
        .space_store
        .resolve_character(space_id, character_id)
        .await?
        .or_not_found()?;
    if character.archived_at.is_some() {
        return Err(AppError::BadRequest(
            "Archived characters cannot be used as a speaker".to_string(),
        ));
    }
    if !can_edit_character_in_space(ctx, &character, user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to portray this character".to_string(),
        ));
    }
    Ok(character)
}

async fn query(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Character, AppError> {
    let session = authenticate_optional(&req).await?;
    let QueryCharacter {
        space_id,
        character_id,
    } = parse_query(req.uri())?;
    let character = if let Some(snapshot) = ctx.space_store.loaded_snapshot_maybe_stale(space_id)
        && let Some(character) = snapshot.characters.get(&character_id)
    {
        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit").increment(1);
        character.clone()
    } else {
        ctx.space_store
            .resolve_character(space_id, character_id)
            .await?
            .or_not_found()?
    };
    let user_id = session.map(|session| session.user_id);
    if !can_view_character_in_space(ctx, &character, user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to view this character".to_string(),
        ));
    }
    Ok(character)
}

async fn by_space(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<Character>, AppError> {
    let session = authenticate_optional(&req).await?;
    let ListCharacters {
        space_id,
        include_archived,
    } = parse_query(req.uri())?;
    let mut characters = if let Some(snapshot) =
        ctx.space_store.loaded_snapshot_maybe_stale(space_id)
    {
        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit").increment(1);
        snapshot.characters.values().cloned().collect()
    } else {
        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "fallback")
            .increment(1);
        Character::list_by_space(&ctx.db, &space_id).await?
    };
    characters.sort_unstable_by_key(|character| std::cmp::Reverse(character.modified));
    if !include_archived {
        characters.retain(|character| character.archived_at.is_none());
    }
    let user_id = session.map(|session| session.user_id);
    let access = resolve_space_access(ctx, space_id, user_id).await?;
    if !access.can_access {
        return Err(AppError::NoPermission(
            "You don't have permission to view this space".to_string(),
        ));
    }
    let mut visible = Vec::with_capacity(characters.len());
    for character in characters {
        if can_view_character_in_space(ctx, &character, user_id).await? {
            visible.push(character);
        }
    }
    Ok(visible)
}

async fn check_identifier(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let CheckCharacterIdentifier {
        space_id,
        identifier,
    } = parse_query(req.uri())?;
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
    let exists =
        Character::exists_identifier(&mut *conn, space_id, Some(&identifier), None).await?;
    Ok(!exists)
}

async fn create(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Character, AppError> {
    let session = authenticate(&req).await?;
    let CreateCharacter {
        space_id,
        name,
        key,
        aliases,
        description,
        color,
        access_policy,
        access_channel_id,
        tags,
    } = parse_body(req).await?;
    let mutation = ctx.space_store.acquire_mutation(space_id).await?;
    let mut trans = ctx.db.begin().await?;
    if !ctx
        .space_store
        .loaded_authoritative_snapshot(space_id)
        .is_some_and(|snapshot| snapshot.space_members.contains_key(&session.user_id))
    {
        SpaceMember::get(&mut *trans, &session.user_id, &space_id)
            .await?
            .or_no_permission()?;
    }
    let target_context =
        resolve_resource_access_context(ctx, space_id, access_channel_id, Some(session.user_id))
            .await?;
    if !access_policy.can_edit(Some(session.user_id), session.user_id, target_context) {
        return Err(AppError::NoPermission(
            "You cannot edit characters with this access policy and context".to_string(),
        ));
    }
    let character = Character::create(
        &mut trans,
        space_id,
        session.user_id,
        &name,
        &key,
        aliases,
        &description,
        &color,
        access_policy,
        access_channel_id,
        tags,
    )
    .await?;
    let scope = Scope::get_by_id(&mut *trans, character.scope_id)
        .await?
        .or_not_found()?;
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.character_updated(&character);
    changes.scope_updated(&scope);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(character)
}

async fn edit(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Character, AppError> {
    let session = authenticate(&req).await?;
    let EditCharacter {
        space_id,
        character_id,
        expected_version,
        expected_scope_version,
        name,
        key,
        aliases,
        description,
        color,
        access_policy,
        access_channel_id,
        tags,
    } = parse_body(req).await?;
    let mutation = ctx.space_store.acquire_mutation(space_id).await?;
    let mut trans = ctx.db.begin().await?;
    let character = Character::get_by_id_in_space(&mut *trans, space_id, &character_id)
        .await?
        .or_not_found()?;
    if character.version != expected_version {
        return Err(AppError::Conflict("Character version is stale".to_string()));
    }
    if character.scope_version != expected_scope_version {
        return Err(AppError::Conflict(
            "Character Scope version is stale".to_string(),
        ));
    }
    if !can_edit_character_in_space(ctx, &character, session.user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to edit this character".to_string(),
        ));
    }
    let target_context =
        resolve_resource_access_context(ctx, space_id, access_channel_id, Some(session.user_id))
            .await?;
    if !access_policy.can_edit(character.owner_id, session.user_id, target_context) {
        return Err(AppError::NoPermission(
            "You cannot edit characters with this access policy and context".to_string(),
        ));
    }
    let updated = Character::update(
        &mut trans,
        &character_id,
        expected_version,
        expected_scope_version,
        name,
        key,
        aliases,
        description,
        color,
        access_policy,
        access_channel_id,
        tags,
    )
    .await?
    .ok_or_else(|| AppError::Conflict("Character version is stale".to_string()))?;
    let scope = Scope::get_by_id(&mut *trans, updated.scope_id)
        .await?
        .or_not_found()?;
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.character_updated(&updated);
    changes.scope_updated(&scope);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(updated)
}

async fn set_archived(
    ctx: &crate::context::AppContext,
    user_id: Uuid,
    space_id: Uuid,
    character_id: Uuid,
    expected_version: Uuid,
    archived: bool,
) -> Result<Character, AppError> {
    let mutation = ctx.space_store.acquire_mutation(space_id).await?;
    let mut trans = ctx.db.begin().await?;
    let character = Character::get_by_id_in_space(&mut *trans, space_id, &character_id)
        .await?
        .or_not_found()?;
    if character.version != expected_version {
        return Err(AppError::Conflict("Character version is stale".to_string()));
    }
    if !can_edit_character_in_space(ctx, &character, user_id).await? {
        return Err(AppError::NoPermission(
            "You don't have permission to edit this character".to_string(),
        ));
    }
    let updated = Character::set_archived(&mut trans, &character_id, expected_version, archived)
        .await?
        .ok_or_else(|| AppError::Conflict("Character version is stale".to_string()))?;
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.character_updated(&updated);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(updated)
}

async fn archive(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Character, AppError> {
    let session = authenticate(&req).await?;
    let ArchiveCharacter {
        space_id,
        character_id,
        expected_version,
    } = parse_body(req).await?;
    set_archived(
        ctx,
        session.user_id,
        space_id,
        character_id,
        expected_version,
        true,
    )
    .await
}

async fn restore(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Character, AppError> {
    let session = authenticate(&req).await?;
    let RestoreCharacter {
        space_id,
        character_id,
        expected_version,
    } = parse_body(req).await?;
    set_archived(
        ctx,
        session.user_id,
        space_id,
        character_id,
        expected_version,
        false,
    )
    .await
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
        ("/check_identifier", Method::GET) => response(check_identifier(ctx, req).await).await,
        ("/create", Method::POST) => response(create(ctx, req).await).await,
        ("/edit", Method::PUT) => response(edit(ctx, req).await).await,
        ("/archive", Method::POST) => response(archive(ctx, req).await).await,
        ("/restore", Method::POST) => response(restore(ctx, req).await).await,
        _ => missing(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::spaces::{AccessPolicy, Space, SpaceMember};
    use crate::users::User;

    async fn create_user(pool: &sqlx::PgPool, prefix: &str) -> User {
        let suffix = Uuid::new_v4().simple().to_string();
        User::register(
            pool,
            &format!("{prefix}_{suffix}@example.com"),
            &format!("{prefix}_{}", &suffix[..8]),
            "Portrayal Tester",
            "PortrayalPass123!",
        )
        .await
        .expect("failed to create user")
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_character_portrayal_requires_edit_access_and_active_character(
        pool: sqlx::PgPool,
    ) {
        let owner = create_user(&pool, "portray_owner").await;
        let other = create_user(&pool, "portray_other").await;
        let space = Space::create(
            &pool,
            format!("portray_{}", &Uuid::new_v4().simple().to_string()[..8]),
            &owner.id,
            "Portrayal test".to_string(),
            None,
            Some("d20"),
        )
        .await
        .expect("failed to create Space");
        SpaceMember::add_user(&pool, &owner.id, &space.id)
            .await
            .expect("failed to add owner to Space");
        SpaceMember::add_user(&pool, &other.id, &space.id)
            .await
            .expect("failed to add other user to Space");

        let mut transaction = pool.begin().await.expect("failed to begin Character");
        let character = Character::create(
            &mut transaction,
            space.id,
            owner.id,
            "Portrayal Character",
            "portrayal_character",
            Vec::new(),
            "",
            "#123456",
            AccessPolicy::Personal,
            None,
            Vec::new(),
        )
        .await
        .expect("failed to create Character");
        transaction
            .commit()
            .await
            .expect("failed to commit Character");

        let ctx = crate::context::AppContext::new(pool.clone(), None);
        let resolved = resolve_character_for_portrayal(&ctx, space.id, character.id, owner.id)
            .await
            .expect("owner should be able to portray Character");
        assert_eq!(resolved.id, character.id);
        assert!(matches!(
            resolve_character_for_portrayal(&ctx, space.id, character.id, other.id).await,
            Err(AppError::NoPermission(_))
        ));

        let mut transaction = pool.begin().await.expect("failed to begin archive");
        Character::set_archived(&mut transaction, &character.id, character.version, true)
            .await
            .expect("failed to archive Character")
            .expect("Character version should match");
        transaction
            .commit()
            .await
            .expect("failed to commit archive");
        let fresh_ctx = crate::context::AppContext::new(pool.clone(), None);
        assert!(matches!(
            resolve_character_for_portrayal(&fresh_ctx, space.id, character.id, owner.id).await,
            Err(AppError::BadRequest(_))
        ));
    }
}
