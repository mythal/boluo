use super::api::{
    CheckCharacterName, CheckVariableAvailability, CreateCharacter, CreateVariable, DeleteVariable,
    EditCharacter, EditVariable, ListCharacters, VariableHistoryQuery,
};
use super::models::{
    Character, CharacterVariable, CharacterVariableHistory, CharacterVisibility, normalize_aliases,
};
use crate::csrf::{authenticate, authenticate_optional};
use crate::error::{AppError, Find};
use crate::interface::{IdQuery, missing, parse_body, parse_query, response};
use crate::spaces::SpaceMember;
use hyper::Request;
use hyper::body::Body;
use serde_json::json;
use uuid::Uuid;

fn can_view_character(character: &Character, user_id: Option<Uuid>) -> bool {
    if let Some(user_id) = user_id
        && character.owner_id == user_id
    {
        return true;
    }
    matches!(character.visibility, CharacterVisibility::Public)
}

async fn query(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Character, AppError> {
    let session = authenticate_optional(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let character = Character::get_by_id(&mut *conn, &id)
        .await?
        .or_not_found()?;
    let user_id = session.map(|session| session.user_id);
    if !can_view_character(&character, user_id) {
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
        id: space_id,
        include_archived,
    } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let mut characters = Character::list_by_space(&mut *conn, &space_id).await?;
    if !include_archived {
        characters.retain(|character| !character.is_archived);
    }
    let Some(session) = session else {
        characters.retain(|character| matches!(character.visibility, CharacterVisibility::Public));
        return Ok(characters);
    };
    let user_id = session.user_id;
    characters.retain(|character| can_view_character(character, Some(user_id)));
    Ok(characters)
}

async fn check_name(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let CheckCharacterName {
        space_id,
        name,
        alias,
    } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    SpaceMember::get(&mut *conn, &session.user_id, &space_id)
        .await?
        .or_no_permission()?;
    let name = name
        .map(|name| name.trim().to_string())
        .filter(|name| !name.is_empty());
    let alias = alias
        .map(|alias| alias.trim().to_string())
        .filter(|alias| !alias.is_empty());

    if name.is_none() && alias.is_none() {
        return Err(AppError::BadRequest(
            "name or alias is required".to_string(),
        ));
    }
    if let Some(name) = name.as_deref() {
        crate::validators::DISPLAY_NAME.run(name)?;
    }
    if let Some(alias) = alias.as_deref() {
        crate::validators::IDENT.run(alias)?;
    }

    let exists =
        Character::exists_name_or_alias(&mut *conn, space_id, name.as_deref(), alias.as_deref())
            .await?;
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
        description,
        color,
        alias,
        image_id,
        visibility,
        is_archived,
        metadata,
    } = parse_body(req).await?;
    let mut conn = ctx.db.acquire().await?;
    SpaceMember::get(&mut *conn, &session.user_id, &space_id)
        .await?
        .or_no_permission()?;
    let metadata = metadata.unwrap_or_else(|| serde_json::json!({}));
    Character::create(
        &mut *conn,
        space_id,
        session.user_id,
        &name,
        &description,
        &color,
        alias,
        image_id,
        visibility,
        is_archived,
        metadata,
    )
    .await
    .map_err(Into::into)
}

async fn edit(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Character, AppError> {
    let session = authenticate(&req).await?;
    let EditCharacter {
        character_id,
        name,
        description,
        color,
        alias,
        image_id,
        visibility,
        is_archived,
        metadata,
    } = parse_body(req).await?;
    let mut conn = ctx.db.acquire().await?;
    let character = Character::get_by_id(&mut *conn, &character_id)
        .await?
        .or_not_found()?;
    if character.owner_id != session.user_id {
        return Err(AppError::NoPermission(
            "You don't have permission to edit this character".to_string(),
        ));
    }
    let updated = Character::update(
        &mut *conn,
        &character_id,
        name,
        description,
        color,
        alias,
        image_id,
        visibility,
        is_archived,
        metadata,
    )
    .await?
    .ok_or(AppError::NotFound("Character"))?;
    Ok(updated)
}

async fn delete(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let character = Character::get_by_id(&mut *conn, &id)
        .await?
        .or_not_found()?;
    if character.owner_id != session.user_id {
        return Err(AppError::NoPermission(
            "You don't have permission to delete this character".to_string(),
        ));
    }
    Character::delete(&mut *conn, &id).await?;
    Ok(true)
}

async fn variables(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<CharacterVariable>, AppError> {
    let session = authenticate_optional(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let character = Character::get_by_id(&mut *conn, &id)
        .await?
        .or_not_found()?;
    let user_id = session.map(|session| session.user_id);
    if !can_view_character(&character, user_id) {
        return Err(AppError::NoPermission(
            "You don't have permission to view this character".to_string(),
        ));
    }
    CharacterVariable::list_by_character(&mut *conn, &id)
        .await
        .map_err(Into::into)
}

async fn create_variable(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<CharacterVariable, AppError> {
    let session = authenticate(&req).await?;
    let CreateVariable {
        character_id,
        key,
        display_name,
        alias,
        sort,
        track_history,
        value,
        metadata,
    } = parse_body(req).await?;
    let mut conn = ctx.db.acquire().await?;
    let character = Character::get_by_id(&mut *conn, &character_id)
        .await?
        .or_not_found()?;
    if character.owner_id != session.user_id {
        return Err(AppError::NoPermission(
            "You don't have permission to edit this character".to_string(),
        ));
    }
    let key = crate::characters::models::normalize_ident(&key)?;
    let metadata = metadata.unwrap_or_else(|| serde_json::json!({}));
    let variable = CharacterVariable::create(
        &mut *conn,
        character_id,
        &key,
        &display_name,
        alias,
        sort,
        track_history,
        value.clone(),
        metadata,
    )
    .await?;
    if track_history {
        CharacterVariableHistory::create(
            &mut *conn,
            Some(session.user_id),
            character_id,
            Some(json!({ "type": "creation" })),
            &key,
            value.clone(),
        )
        .await?;
    }
    Ok(variable)
}

async fn edit_variable(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<CharacterVariable, AppError> {
    let session = authenticate(&req).await?;
    let EditVariable {
        character_id,
        key,
        display_name,
        alias,
        sort,
        track_history,
        value,
        metadata,
        reason,
    } = parse_body(req).await?;
    let mut trans = ctx.db.begin().await?;
    let character = Character::get_by_id(&mut *trans, &character_id)
        .await?
        .or_not_found()?;
    if character.owner_id != session.user_id {
        return Err(AppError::NoPermission(
            "You don't have permission to edit this character".to_string(),
        ));
    }
    let variable = CharacterVariable::get_by_key(&mut *trans, &character_id, &key)
        .await?
        .or_not_found()?;
    let content_changed = value
        .as_ref()
        .map(|new_value| new_value != &variable.value)
        .unwrap_or(false);
    let effective_track_history = track_history.unwrap_or(variable.track_history);
    if content_changed && effective_track_history {
        CharacterVariableHistory::create(
            &mut *trans,
            Some(session.user_id),
            character_id,
            reason,
            &key,
            variable.value.clone(),
        )
        .await?;
    }
    let updated = CharacterVariable::update(
        &mut *trans,
        &character_id,
        &key,
        display_name,
        alias,
        sort,
        track_history,
        value,
        metadata,
    )
    .await?
    .ok_or(AppError::NotFound("CharacterVariable"))?;
    trans.commit().await?;
    Ok(updated)
}

async fn delete_variable(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let DeleteVariable { character_id, key } = parse_body(req).await?;
    let mut conn = ctx.db.acquire().await?;
    let character = Character::get_by_id(&mut *conn, &character_id)
        .await?
        .or_not_found()?;
    if character.owner_id != session.user_id {
        return Err(AppError::NoPermission(
            "You don't have permission to edit this character".to_string(),
        ));
    }
    let variable = CharacterVariable::get_by_key(&mut *conn, &character_id, &key)
        .await?
        .or_not_found()?;
    CharacterVariable::delete(&mut *conn, &character_id, &key).await?;
    if variable.track_history {
        CharacterVariableHistory::create(
            &mut *conn,
            Some(session.user_id),
            character_id,
            Some(json!({ "type": "deletion" })),
            &key,
            serde_json::Value::Null,
        )
        .await?
    };
    Ok(true)
}

async fn variable_history(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<CharacterVariableHistory>, AppError> {
    let session = authenticate_optional(&req).await?;
    let VariableHistoryQuery { character_id, key } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let character = Character::get_by_id(&mut *conn, &character_id)
        .await?
        .or_not_found()?;
    let user_id = session.map(|session| session.user_id);
    if !can_view_character(&character, user_id) {
        return Err(AppError::NoPermission(
            "You don't have permission to view this character".to_string(),
        ));
    }
    CharacterVariableHistory::list_by_key(&mut *conn, &character_id, &key)
        .await
        .map_err(Into::into)
}

async fn check_variable(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate_optional(&req).await?;
    let CheckVariableAvailability {
        character_id,
        key,
        alias,
    } = parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let character = Character::get_by_id(&mut *conn, &character_id)
        .await?
        .or_not_found()?;
    let user_id = session.map(|session| session.user_id);
    if !can_view_character(&character, user_id) {
        return Err(AppError::NoPermission(
            "You don't have permission to view this character".to_string(),
        ));
    }

    let key = key
        .map(|key| key.trim().to_string())
        .filter(|key| !key.is_empty());
    if let Some(key) = key.as_deref() {
        crate::validators::IDENT.run(key)?;
    }
    let alias = if alias.is_empty() {
        None
    } else {
        let alias = normalize_aliases(alias)?;
        if alias.is_empty() { None } else { Some(alias) }
    };
    if key.is_none() && alias.is_none() {
        return Err(AppError::BadRequest("key or alias is required".to_string()));
    }

    let exists = CharacterVariable::exists_key_or_alias(
        &mut *conn,
        character_id,
        key.as_deref(),
        alias.as_deref(),
    )
    .await?;
    Ok(!exists)
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
        ("/check_name", Method::GET) => response(check_name(ctx, req).await).await,
        ("/create", Method::POST) => response(create(ctx, req).await).await,
        ("/edit", Method::POST) => response(edit(ctx, req).await).await,
        ("/edit", Method::PUT) => response(edit(ctx, req).await).await,
        ("/delete", Method::POST) => response(delete(ctx, req).await).await,
        ("/variables", Method::GET) => response(variables(ctx, req).await).await,
        ("/create_variable", Method::POST) => response(create_variable(ctx, req).await).await,
        ("/edit_variable", Method::POST) => response(edit_variable(ctx, req).await).await,
        ("/edit_variable", Method::PUT) => response(edit_variable(ctx, req).await).await,
        ("/delete_variable", Method::POST) => response(delete_variable(ctx, req).await).await,
        ("/variable_history", Method::GET) => response(variable_history(ctx, req).await).await,
        ("/check_variable", Method::GET) => response(check_variable(ctx, req).await).await,
        _ => missing(),
    }
}
