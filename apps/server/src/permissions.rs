use anyhow::anyhow;
use uuid::Uuid;

use crate::channels::Channel;
use crate::channels::ChannelMember;
use crate::error::AppError;
use crate::spaces::Space;
use crate::spaces::SpaceMember;

/// Actions that require authorization.
pub enum Action {
    Space(SpaceAction),
    Channel(ChannelAction),
    Message(MessageAction),
}

pub enum SpaceAction {
    ManageInviteToken,
    Edit,
    KickMember { target_is_admin: bool },
    UpdateSettings,
    Delete,
}

pub enum ChannelAction {
    Edit,
    EditTopic,
    ManageMasters,
    KickMember,
}

pub enum MessageAction {
    Delete,
}

/// Context collected at handler level to evaluate permissions.
pub struct PermissionCtx<'a> {
    pub user_id: &'a Uuid,
    pub space: Option<&'a Space>,
    pub space_member: Option<&'a SpaceMember>,
    pub channel: Option<&'a Channel>,
    pub channel_member: Option<&'a ChannelMember>,
    pub message_sender: Option<&'a Uuid>,
}

impl<'a> PermissionCtx<'a> {
    pub fn new(user_id: &'a Uuid) -> Self {
        Self {
            user_id,
            space: None,
            space_member: None,
            channel: None,
            channel_member: None,
            message_sender: None,
        }
    }

    pub fn with_space(mut self, space: &'a Space, space_member: Option<&'a SpaceMember>) -> Self {
        self.space = Some(space);
        self.space_member = space_member;
        self
    }

    pub fn with_channel(
        mut self,
        channel: &'a Channel,
        space: &'a Space,
        space_member: Option<&'a SpaceMember>,
        channel_member: Option<&'a ChannelMember>,
    ) -> Self {
        self.channel = Some(channel);
        self.space = Some(space);
        self.space_member = space_member;
        self.channel_member = channel_member;
        self
    }

    pub fn with_message_sender(mut self, sender: &'a Uuid) -> Self {
        self.message_sender = Some(sender);
        self
    }
}

pub fn authorize(action: Action, ctx: PermissionCtx<'_>) -> Result<(), AppError> {
    match action {
        Action::Space(space_action) => authorize_space(space_action, ctx),
        Action::Channel(channel_action) => authorize_channel(channel_action, ctx),
        Action::Message(message_action) => authorize_message(message_action, ctx),
    }
}

fn authorize_space(action: SpaceAction, ctx: PermissionCtx<'_>) -> Result<(), AppError> {
    let space = ctx
        .space
        .ok_or_else(|| AppError::Unexpected(anyhow!("Space context is required for space action")))?;

    let is_owner = space.owner_id == *ctx.user_id;
    let is_admin = is_owner || ctx.space_member.map(|m| m.is_admin).unwrap_or(false);

    match action {
        SpaceAction::ManageInviteToken | SpaceAction::Edit | SpaceAction::UpdateSettings => {
            if is_admin {
                Ok(())
            } else {
                Err(AppError::NoPermission("Only admins can manage space".to_string()))
            }
        }
        SpaceAction::KickMember { target_is_admin } => {
            if target_is_admin && !is_owner {
                return Err(AppError::BadRequest("Can't kick admin".to_string()));
            }
            if is_admin {
                Ok(())
            } else {
                Err(AppError::NoPermission("Only admins can kick members".to_string()))
            }
        }
        SpaceAction::Delete => {
            if is_owner {
                Ok(())
            } else {
                Err(AppError::NoPermission(
                    "You are not the owner of this space".to_string(),
                ))
            }
        }
    }
}

fn authorize_channel(action: ChannelAction, ctx: PermissionCtx<'_>) -> Result<(), AppError> {
    let space = ctx
        .space
        .ok_or_else(|| AppError::Unexpected(anyhow!("Space context is required for channel action")))?;
    let _channel = ctx.channel.ok_or_else(|| {
        AppError::Unexpected(anyhow!("Channel context is required for channel action"))
    })?;

    let is_space_owner = space.owner_id == *ctx.user_id;
    let is_space_admin = is_space_owner || ctx.space_member.map(|m| m.is_admin).unwrap_or(false);
    let is_channel_master = ctx
        .channel_member
        .map(|member| member.is_master)
        .unwrap_or(false);

    match action {
        ChannelAction::Edit | ChannelAction::ManageMasters => {
            if is_space_admin {
                Ok(())
            } else {
                Err(AppError::NoPermission("user is not admin".to_string()))
            }
        }
        ChannelAction::EditTopic => {
            if is_space_admin || is_channel_master {
                Ok(())
            } else {
                Err(AppError::NoPermission(
                    "You have no permission to edit this channel topic.".to_string(),
                ))
            }
        }
        ChannelAction::KickMember => {
            if is_space_admin || is_channel_master {
                Ok(())
            } else {
                Err(AppError::NoPermission(
                    "You have no permission to kick user from this channel.".to_string(),
                ))
            }
        }
    }
}

fn authorize_message(action: MessageAction, ctx: PermissionCtx<'_>) -> Result<(), AppError> {
    let space_member = ctx.space_member;
    let message_sender = ctx.message_sender;
    match action {
        MessageAction::Delete => {
            let is_admin = ctx
                .space
                .map(|space| space.owner_id == *ctx.user_id)
                .unwrap_or(false)
                || space_member.map(|m| m.is_admin).unwrap_or(false);
            let is_sender = message_sender == Some(ctx.user_id);
            if is_admin || is_sender {
                Ok(())
            } else {
                Err(AppError::NoPermission("user id mismatch".to_string()))
            }
        }
    }
}
