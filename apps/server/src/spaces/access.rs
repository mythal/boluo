use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::channels::ChannelMember;
use crate::error::{AppError, ModelError};

use super::{Space, SpaceMember};

#[derive(Debug, Clone, Copy)]
pub struct SpaceAccess {
    pub can_access: bool,
    pub is_member: bool,
    pub is_admin: bool,
    pub is_game_master: bool,
    pub is_owner: bool,
}

impl SpaceAccess {
    pub fn can_manage(self) -> bool {
        self.is_owner || self.is_admin
    }
}

#[derive(Debug, Clone, Copy)]
pub struct ResourceAccessContext {
    pub can_view: bool,
    pub is_member: bool,
    pub is_game_master: bool,
    pub can_manage: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, specta::Type, sqlx::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(type_name = "access_policy", rename_all = "PascalCase")]
pub enum AccessPolicy {
    Public,
    Collaborative,
    Personal,
    Secret,
    GameMaster,
}

impl AccessPolicy {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::Public => "Public",
            Self::Collaborative => "Collaborative",
            Self::Personal => "Personal",
            Self::Secret => "Secret",
            Self::GameMaster => "GameMaster",
        }
    }

    pub fn can_view(
        self,
        resource_owner_id: Option<Uuid>,
        user_id: Option<Uuid>,
        context: ResourceAccessContext,
    ) -> bool {
        let is_resource_owner =
            context.is_member && user_id.is_some_and(|user_id| resource_owner_id == Some(user_id));
        match self {
            Self::Public | Self::Collaborative => context.can_view || context.can_manage,
            Self::Personal => is_resource_owner,
            Self::Secret => is_resource_owner || context.is_game_master,
            Self::GameMaster => context.is_game_master,
        }
    }

    pub fn can_edit(
        self,
        resource_owner_id: Option<Uuid>,
        user_id: Uuid,
        context: ResourceAccessContext,
    ) -> bool {
        let is_resource_owner =
            context.is_member && resource_owner_id.is_some_and(|owner_id| owner_id == user_id);
        match self {
            Self::Public => context.can_manage || is_resource_owner || context.is_game_master,
            Self::Collaborative => context.can_manage || context.is_member,
            Self::Personal => is_resource_owner,
            Self::Secret => is_resource_owner || context.is_game_master,
            Self::GameMaster => context.is_game_master,
        }
    }
}

pub async fn resolve_space_access(
    ctx: &crate::context::AppContext,
    space_id: Uuid,
    user_id: Option<Uuid>,
) -> Result<SpaceAccess, AppError> {
    if let Some(snapshot) = ctx
        .space_store
        .loaded_authoritative_snapshot_after_wait(space_id)
        .await
    {
        let space = snapshot.space();
        let member = user_id.and_then(|user_id| snapshot.space_members.get(&user_id));
        let is_member = member.is_some();
        return Ok(SpaceAccess {
            can_access: space.is_public || space.allow_spectator || is_member,
            is_member,
            is_admin: member.is_some_and(|member| member.is_admin),
            is_game_master: member.is_some_and(|member| member.is_game_master),
            is_owner: user_id == Some(space.owner_id),
        });
    }

    let space = Space::get_by_id(&ctx.db, &space_id)
        .await?
        .ok_or(AppError::NotFound("space"))?;
    let member = match user_id {
        Some(user_id) => SpaceMember::get(&ctx.db, &user_id, &space_id).await?,
        None => None,
    };
    let is_member = member.is_some();
    Ok(SpaceAccess {
        can_access: space.is_public || space.allow_spectator || is_member,
        is_member,
        is_admin: member.as_ref().is_some_and(|member| member.is_admin),
        is_game_master: member.is_some_and(|member| member.is_game_master),
        is_owner: user_id == Some(space.owner_id),
    })
}

pub async fn resolve_resource_access_context(
    ctx: &crate::context::AppContext,
    space_id: Uuid,
    access_channel_id: Option<Uuid>,
    user_id: Option<Uuid>,
) -> Result<ResourceAccessContext, AppError> {
    let space_access = resolve_space_access(ctx, space_id, user_id).await?;
    let Some(channel_id) = access_channel_id else {
        return Ok(ResourceAccessContext {
            can_view: space_access.can_access,
            is_member: space_access.is_member,
            is_game_master: space_access.is_game_master,
            can_manage: space_access.can_manage(),
        });
    };

    let resolved = ctx
        .space_store
        .resolve_channel(channel_id, Some(space_id))
        .await?
        .ok_or(AppError::NotFound("access channel"))?;
    if resolved.channel.space_id != space_id {
        return Err(AppError::NotFound("access channel"));
    }

    let channel_member = match user_id {
        Some(user_id) => {
            if let Some(snapshot) = resolved.snapshot {
                snapshot
                    .channel_member(channel_id, user_id)
                    .map(|member| member.channel)
            } else {
                ChannelMember::get_with_space_member(&ctx.db, user_id, channel_id, &space_id)
                    .await?
                    .map(|(channel_member, _)| channel_member)
            }
        }
        None => None,
    };
    let is_member = space_access.is_member && channel_member.is_some();
    let can_view = space_access.can_manage()
        || is_member
        || (resolved.channel.is_public && space_access.can_access);
    let is_game_master = is_member && channel_member.is_some_and(|member| member.is_master);

    Ok(ResourceAccessContext {
        can_view,
        is_member,
        is_game_master,
        can_manage: space_access.can_manage(),
    })
}

pub async fn validate_access_channel(
    db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    space_id: Uuid,
    access_channel_id: Option<Uuid>,
) -> Result<(), ModelError> {
    let Some(channel_id) = access_channel_id else {
        return Ok(());
    };
    let valid = sqlx::query_scalar!(
        r#"
        SELECT id
        FROM channels
        WHERE id = $1
          AND space_id = $2
          AND deleted = FALSE
        FOR UPDATE
        "#,
        channel_id,
        space_id,
    )
    .fetch_optional(&mut **db)
    .await?;
    if valid.is_none() {
        return Err(ModelError::NotFound("Access Channel"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::channels::{Channel, ChannelMember, ChannelType};
    use crate::context::AppContext;
    use crate::users::User;

    fn context(
        can_view: bool,
        is_member: bool,
        is_game_master: bool,
        can_manage: bool,
    ) -> ResourceAccessContext {
        ResourceAccessContext {
            can_view,
            is_member,
            is_game_master,
            can_manage,
        }
    }

    #[test]
    fn restricted_profiles_do_not_grant_access_to_administrators() {
        let owner_id = Uuid::new_v4();
        let admin_id = Uuid::new_v4();
        let admin = context(true, true, false, true);

        for policy in [AccessPolicy::Personal, AccessPolicy::Secret] {
            assert!(!policy.can_view(Some(owner_id), Some(admin_id), admin));
            assert!(!policy.can_edit(Some(owner_id), admin_id, admin));
        }
    }

    #[test]
    fn policies_use_context_membership_and_game_master_status() {
        let owner_id = Uuid::new_v4();
        let member_id = Uuid::new_v4();
        let viewer = context(true, false, false, false);
        let member = context(true, true, false, false);
        let game_master = context(true, true, true, false);

        assert!(AccessPolicy::Public.can_view(Some(owner_id), Some(member_id), viewer));
        assert!(!AccessPolicy::Public.can_edit(Some(owner_id), member_id, viewer));
        assert!(AccessPolicy::Collaborative.can_view(None, None, viewer));
        assert!(AccessPolicy::Collaborative.can_edit(None, member_id, member));
        assert!(AccessPolicy::Personal.can_edit(Some(owner_id), owner_id, member));
        assert!(!AccessPolicy::Personal.can_view(Some(owner_id), Some(owner_id), viewer));
        assert!(AccessPolicy::Secret.can_view(None, Some(member_id), game_master));
        assert!(AccessPolicy::GameMaster.can_edit(None, member_id, game_master));
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_channel_access_context_and_application_space_validation(pool: sqlx::PgPool) {
        let suffix = Uuid::new_v4().simple().to_string();
        let owner = User::register(
            &pool,
            &format!("access_owner_{suffix}@example.com"),
            &format!("access_owner_{}", &suffix[..8]),
            "Access Owner",
            "AccessPass123!",
        )
        .await
        .expect("failed to create owner");
        let other = User::register(
            &pool,
            &format!("access_other_{suffix}@example.com"),
            &format!("access_other_{}", &suffix[..8]),
            "Access Other",
            "AccessPass123!",
        )
        .await
        .expect("failed to create other user");
        let outsider = User::register(
            &pool,
            &format!("access_outsider_{suffix}@example.com"),
            &format!("access_outsider_{}", &suffix[..8]),
            "Access Outsider",
            "AccessPass123!",
        )
        .await
        .expect("failed to create outsider");
        let space = Space::create(
            &pool,
            format!("access_space_{}", &suffix[..8]),
            &owner.id,
            "access context".to_string(),
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
        SpaceMember::set_game_master(&pool, &other.id, &space.id, true)
            .await
            .expect("failed to make other user a Space GM")
            .expect("other Space member is missing");
        let channel = Channel::create(
            &pool,
            &space.id,
            "Secret Channel",
            false,
            Some("d20"),
            ChannelType::InGame,
        )
        .await
        .expect("failed to create Channel");
        ChannelMember::add_user(&pool, owner.id, channel.id, "", true)
            .await
            .expect("failed to add Channel master");
        sqlx::query!(
            r#"
            INSERT INTO channel_members (
                user_id,
                channel_id,
                character_name,
                is_master,
                is_joined
            ) VALUES ($1, $2, '', TRUE, TRUE)
            "#,
            outsider.id,
            channel.id,
        )
        .execute(&pool)
        .await
        .expect("failed to create inconsistent outsider Channel master");

        let ctx = AppContext::new(pool.clone(), None);
        ctx.space_store
            .authoritative_snapshot(space.id)
            .await
            .expect("failed to load Space runtime")
            .expect("Space runtime snapshot is not authoritative");
        let owner_context =
            resolve_resource_access_context(&ctx, space.id, Some(channel.id), Some(owner.id))
                .await
                .expect("failed to resolve Channel master context");
        assert!(owner_context.can_view);
        assert!(owner_context.is_member);
        assert!(owner_context.is_game_master);

        let other_context =
            resolve_resource_access_context(&ctx, space.id, Some(channel.id), Some(other.id))
                .await
                .expect("failed to resolve non-Channel-member context");
        assert!(!other_context.can_view);
        assert!(!other_context.is_member);
        assert!(!other_context.is_game_master);

        let outsider_context =
            resolve_resource_access_context(&ctx, space.id, Some(channel.id), Some(outsider.id))
                .await
                .expect("failed to resolve outsider context");
        assert!(!outsider_context.can_view);
        assert!(!outsider_context.is_member);
        assert!(!outsider_context.is_game_master);

        let other_space = Space::create(
            &pool,
            format!("access_other_space_{}", &suffix[..8]),
            &owner.id,
            "other access context".to_string(),
            None,
            Some("d20"),
        )
        .await
        .expect("failed to create other Space");
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        assert!(
            validate_access_channel(&mut transaction, space.id, Some(channel.id))
                .await
                .is_ok()
        );
        transaction
            .rollback()
            .await
            .expect("failed to roll back access Channel validation");
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        assert!(matches!(
            validate_access_channel(&mut transaction, other_space.id, Some(channel.id)).await,
            Err(ModelError::NotFound("Access Channel"))
        ));
    }
}
