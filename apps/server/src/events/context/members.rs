use std::collections::HashMap;

use uuid::Uuid;

use crate::{
    channels::{ChannelMember, models::Member},
    events::types::ChannelUserId,
    spaces::SpaceMember,
};

pub(super) struct MembersCache {
    channel_member_map: HashMap<ChannelUserId, ChannelMember, ahash::RandomState>,
    space_member_map: HashMap<Uuid, SpaceMember, ahash::RandomState>,
}

pub enum Action {
    UpdateSpaceMember(SpaceMember),
    UpdateChannelMember(ChannelMember),
    RemoveUser(Uuid),
    RemoveFromChannel(ChannelUserId),
    UpdateBySpaceMembers(Vec<SpaceMember>),
    UpdateByMembers(Vec<Member>),
    RemoveChannel(Uuid),
    QueryByChannel(Uuid, tokio::sync::oneshot::Sender<Vec<Member>>),
    QueryByChannelUser(ChannelUserId, tokio::sync::oneshot::Sender<Option<Member>>),
}

impl MembersCache {
    pub(super) fn new() -> Self {
        Self {
            channel_member_map: HashMap::with_hasher(ahash::RandomState::default()),
            space_member_map: HashMap::with_hasher(ahash::RandomState::default()),
        }
    }

    pub(super) fn update(&mut self, action: Action) {
        match action {
            Action::UpdateSpaceMember(space_member) => {
                self.space_member_map
                    .insert(space_member.user_id, space_member);
            }
            Action::UpdateChannelMember(channel_member) => {
                let channel_user_id =
                    ChannelUserId::new(channel_member.channel_id, channel_member.user_id);
                self.channel_member_map
                    .insert(channel_user_id, channel_member);
            }
            Action::RemoveUser(user_id) => {
                self.space_member_map.remove(&user_id);
                self.channel_member_map
                    .retain(|channel_user_id, _| channel_user_id.user_id != user_id);
            }
            Action::RemoveFromChannel(channel_user_id) => {
                self.channel_member_map.remove(&channel_user_id);
            }
            Action::UpdateBySpaceMembers(space_members) => {
                for space_member in space_members {
                    self.space_member_map
                        .insert(space_member.user_id, space_member);
                }
            }
            Action::UpdateByMembers(members) => {
                for Member { channel, space } in members {
                    self.channel_member_map.insert(
                        ChannelUserId::new(channel.channel_id, channel.user_id),
                        channel,
                    );
                    self.space_member_map.insert(space.user_id, space);
                }
            }
            Action::RemoveChannel(channel_id) => {
                self.channel_member_map
                    .retain(|channel_user_id, _| channel_user_id.channel_id != channel_id);
            }
            Action::QueryByChannel(channel_id, sender) => {
                let channel_members = self
                    .channel_member_map
                    .values()
                    .filter(|member| member.channel_id == channel_id);
                let members: Vec<Member> = channel_members
                    .filter_map(|member| {
                        self.space_member_map
                            .get(&member.user_id)
                            .map(|space_member| Member {
                                channel: member.clone(),
                                space: space_member.clone(),
                            })
                    })
                    .collect();
                if let Err(_) = sender.send(members) {
                    tracing::error!(channel_id = %channel_id, "Failed to send members query");
                }
            }
            Action::QueryByChannelUser(channel_user_id, sender) => {
                let Some(channel_member) = self.channel_member_map.get(&channel_user_id) else {
                    tracing::warn!(channel_user_id = ?channel_user_id, "Channel member not found");
                    sender.send(None).ok();
                    return;
                };
                let Some(space_member) = self.space_member_map.get(&channel_user_id.user_id) else {
                    tracing::warn!(channel_user_id = ?channel_user_id, "Space member not found");
                    sender.send(None).ok();
                    return;
                };
                let member = Some(Member {
                    channel: channel_member.clone(),
                    space: space_member.clone(),
                });
                if let Err(_) = sender.send(member) {
                    tracing::error!(channel_user_id = ?channel_user_id, "Failed to send members query");
                }
            }
        }
    }
}
