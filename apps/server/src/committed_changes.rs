use std::collections::{HashMap, HashSet};

use uuid::Uuid;

use crate::cache::{CACHE, CacheType};
use crate::channels::models::Member;
use crate::channels::{Channel, ChannelMember};
use crate::characters::Character;
use crate::space_runtime::{SpaceDelta, SpaceMutationGuard, SpaceMutationProof, SpaceRuntimeError};
use crate::spaces::{Space, SpaceMember};

/// Domain changes that are safe to apply to process-wide state after a successful database commit.
///
/// Construct this value only after `Transaction::commit` succeeds. Database model writes must not
/// mutate shared state themselves.
///
/// This currently coordinates only process-local Space runtimes and cache entries. Before adding
/// multi-node deployment, broadcast runtime changes and cache invalidations across server nodes.
#[derive(Default)]
pub(crate) struct CommittedChanges {
    space_deltas: HashMap<Uuid, Vec<SpaceDelta>>,
    removed_spaces: HashMap<Uuid, HashSet<Uuid>>,
    changed_character_variables: HashSet<Uuid>,
    changed_user_spaces: HashSet<Uuid>,
    channel_member_refreshes: HashSet<(Uuid, Uuid)>,
}

#[derive(Default)]
pub(crate) struct AppliedChanges {
    channel_members: HashMap<(Uuid, Uuid), Vec<Member>>,
}

impl AppliedChanges {
    pub(crate) fn take_channel_members(
        &mut self,
        space_id: Uuid,
        channel_id: Uuid,
    ) -> Option<Vec<Member>> {
        self.channel_members.remove(&(space_id, channel_id))
    }
}

impl CommittedChanges {
    pub(crate) fn space_created(&mut self, space: &Space) {
        self.space_updated(space);
    }

    pub(crate) fn space_updated(&mut self, space: &Space) {
        self.space_deltas
            .entry(space.id)
            .or_default()
            .push(SpaceDelta::SpaceUpdated(space.clone()));
        self.removed_spaces.remove(&space.id);
    }

    pub(crate) fn space_settings_updated(&mut self, space_id: Uuid, settings: serde_json::Value) {
        self.space_deltas
            .entry(space_id)
            .or_default()
            .push(SpaceDelta::SettingsUpdated(settings));
    }

    pub(crate) fn space_invite_token_updated(&mut self, space_id: Uuid, token: Uuid) {
        self.space_deltas
            .entry(space_id)
            .or_default()
            .push(SpaceDelta::InviteTokenUpdated(token));
    }

    pub(crate) fn space_deleted(
        &mut self,
        space_id: Uuid,
        member_user_ids: impl IntoIterator<Item = Uuid>,
    ) {
        self.removed_spaces
            .entry(space_id)
            .or_default()
            .extend(member_user_ids);
    }

    pub(crate) fn channel_created(&mut self, channel: &Channel) {
        self.channel_updated(channel);
    }

    pub(crate) fn channel_updated(&mut self, channel: &Channel) {
        self.space_deltas
            .entry(channel.space_id)
            .or_default()
            .push(SpaceDelta::ChannelUpserted(channel.clone()));
    }

    pub(crate) fn channel_deleted(&mut self, space_id: Uuid, channel_id: Uuid) {
        self.space_deltas
            .entry(space_id)
            .or_default()
            .push(SpaceDelta::ChannelDeleted(channel_id));
    }

    pub(crate) fn character_updated(&mut self, character: &Character) {
        self.space_deltas
            .entry(character.space_id)
            .or_default()
            .push(SpaceDelta::CharacterUpserted(character.clone()));
    }

    pub(crate) fn character_deleted(&mut self, space_id: Uuid, character_id: Uuid) {
        self.space_deltas
            .entry(space_id)
            .or_default()
            .push(SpaceDelta::CharacterDeleted(character_id));
        self.changed_character_variables.insert(character_id);
    }

    pub(crate) fn character_variables_changed(&mut self, character_id: Uuid) {
        self.changed_character_variables.insert(character_id);
    }

    pub(crate) fn channel_member_added(&mut self, space_id: Uuid, member: &ChannelMember) {
        self.channel_member_changed(space_id, member);
    }

    pub(crate) fn channel_member_changed(&mut self, space_id: Uuid, member: &ChannelMember) {
        self.space_deltas
            .entry(space_id)
            .or_default()
            .push(SpaceDelta::ChannelMemberUpserted(member.clone()));
        self.channel_member_refreshes
            .insert((space_id, member.channel_id));
    }

    pub(crate) fn channel_member_removed(
        &mut self,
        space_id: Uuid,
        channel_id: Uuid,
        user_id: Uuid,
    ) {
        self.space_deltas
            .entry(space_id)
            .or_default()
            .push(SpaceDelta::ChannelMemberRemoved {
                channel_id,
                user_id,
            });
        self.channel_member_refreshes.insert((space_id, channel_id));
    }

    pub(crate) fn space_member_added(&mut self, member: &SpaceMember) {
        self.space_deltas
            .entry(member.space_id)
            .or_default()
            .push(SpaceDelta::SpaceMemberUpserted(member.clone()));
        self.changed_user_spaces.insert(member.user_id);
    }

    pub(crate) fn space_member_changed(&mut self, member: &SpaceMember) {
        self.space_member_added(member);
    }

    pub(crate) fn space_member_removed(
        &mut self,
        space_id: Uuid,
        user_id: Uuid,
        channel_ids: impl IntoIterator<Item = Uuid>,
    ) {
        let channel_ids: Vec<_> = channel_ids.into_iter().collect();
        self.space_deltas
            .entry(space_id)
            .or_default()
            .push(SpaceDelta::SpaceMemberRemoved {
                user_id,
                channel_ids: channel_ids.clone(),
            });
        self.changed_user_spaces.insert(user_id);
        self.channel_member_refreshes.extend(
            channel_ids
                .into_iter()
                .map(|channel_id| (space_id, channel_id)),
        );
    }

    pub(crate) async fn apply(self) -> AppliedChanges {
        let applied = AppliedChanges::default();
        for (_space_id, member_user_ids) in self.removed_spaces {
            for user_id in member_user_ids {
                CACHE.invalidate_local(CacheType::UserSpaces, user_id);
            }
        }
        for character_id in self.changed_character_variables {
            CACHE.invalidate_local(CacheType::CharacterVariables, character_id);
        }
        for user_id in self.changed_user_spaces {
            CACHE.invalidate_local(CacheType::UserSpaces, user_id);
        }
        applied
    }

    /// Applies transitional state and then advances every already-loaded Space runtime.
    pub(crate) async fn apply_with_context(
        self,
        ctx: &crate::context::AppContext,
    ) -> AppliedChanges {
        self.apply_with_context_inner(ctx, None).await
    }

    /// Applies changes using the snapshot generation reserved by `mutation`.
    pub(crate) async fn apply_with_mutation(
        self,
        ctx: &crate::context::AppContext,
        mutation: &SpaceMutationGuard,
    ) -> AppliedChanges {
        self.apply_with_context_inner(ctx, Some(mutation.proof()))
            .await
    }

    fn report_space_runtime_apply(space_id: Uuid, result: Result<Option<u64>, SpaceRuntimeError>) {
        if let Err(error) = result {
            metrics::counter!(
                "boluo_server_post_commit_effect_failed_total",
                "effect" => "apply_space_runtime_changes"
            )
            .increment(1);
            tracing::error!(
                %error,
                %space_id,
                "Failed to apply committed Space runtime changes"
            );
        }
    }

    async fn apply_with_context_inner(
        self,
        ctx: &crate::context::AppContext,
        mutation: Option<SpaceMutationProof>,
    ) -> AppliedChanges {
        let space_deltas = self.space_deltas.clone();
        let channel_member_refreshes = self.channel_member_refreshes.clone();
        let removed_spaces: HashSet<_> = self.removed_spaces.keys().copied().collect();
        let mut applied = self.apply().await;
        for space_id in &removed_spaces {
            ctx.space_store.remove(*space_id);
        }

        if mutation.is_some() && space_deltas.len() <= 1 {
            if let Some((space_id, deltas)) = space_deltas.into_iter().next()
                && !removed_spaces.contains(&space_id)
            {
                let result = ctx
                    .space_store
                    .apply_deltas_if_loaded(space_id, deltas, mutation)
                    .await;
                Self::report_space_runtime_apply(space_id, result);
            }
        } else {
            let mut refreshes = tokio::task::JoinSet::new();
            for (space_id, deltas) in space_deltas {
                if removed_spaces.contains(&space_id) {
                    continue;
                }
                let store = ctx.space_store.clone();
                refreshes.spawn(async move {
                    (
                        space_id,
                        store
                            .apply_deltas_if_loaded(space_id, deltas, mutation)
                            .await,
                    )
                });
            }
            while let Some(result) = refreshes.join_next().await {
                match result {
                    Ok((space_id, result)) => {
                        Self::report_space_runtime_apply(space_id, result);
                    }
                    Err(error) => {
                        metrics::counter!(
                            "boluo_server_post_commit_effect_failed_total",
                            "effect" => "join_space_runtime_changes"
                        )
                        .increment(1);
                        tracing::error!(
                            %error,
                            "Space runtime change task failed after database commit"
                        );
                    }
                }
            }
        }
        let mut member_refreshes_by_space: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for (space_id, channel_id) in channel_member_refreshes {
            member_refreshes_by_space
                .entry(space_id)
                .or_default()
                .push(channel_id);
        }
        for (space_id, channel_ids) in member_refreshes_by_space {
            if let Some(snapshot) = ctx
                .space_store
                .get(&space_id)
                .and_then(|runtime| runtime.authoritative_snapshot())
            {
                for channel_id in channel_ids {
                    applied.channel_members.insert(
                        (space_id, channel_id),
                        snapshot.members_in_channel(channel_id),
                    );
                }
                continue;
            }
            match Member::get_by_channels(&ctx.db, space_id, &channel_ids).await {
                Ok(members_by_channel) => {
                    applied.channel_members.extend(
                        members_by_channel
                            .into_iter()
                            .map(|(channel_id, members)| ((space_id, channel_id), members)),
                    );
                }
                Err(error) => {
                    metrics::counter!(
                        "boluo_server_post_commit_effect_failed_total",
                        "effect" => "refresh_channel_members"
                    )
                    .increment(1);
                    tracing::error!(
                        %error,
                        %space_id,
                        channel_count = channel_ids.len(),
                        "Failed to refresh Channel members after database commit"
                    );
                }
            }
        }
        applied
    }
}
