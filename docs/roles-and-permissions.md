# Roles and Permissions (current server behavior)

This summarizes how the server currently gates actions based on roles and flags in `apps/server`.

## Roles
- **Space Owner**: `Space.owner_id`; always treated as admin for permission checks.
- **Space Admin**: `SpaceMember.is_admin`; owner counts as admin. Controls most space and channel management.
- **Space Member**: Listed in `space_members`; gained via joining a space.
- **Channel Master**: `ChannelMember.is_master`; elevated per-channel role (often the GM).
- **Channel Member**: Listed in `channel_members`; standard channel participant.
- **Guest/Spectator**: Unauthenticated or non-member users. Access depends on public/spectator flags.

## What Space Admins Can Do
- Must be a member of the space; owner is implicitly admin.
- Manage invite tokens: fetch/refresh.
- Edit space metadata/settings (name, description, visibility, spectator flag, dice defaults, etc.).
- Manage channel structure: create channels, edit channel metadata (name/topic/type/privacy/dice defaults), delete channels.
- Manage channel masters: grant/revoke master status; can also edit channel topics themselves.
- Remove people: kick members from the space (owner required to kick another admin); kick channel members; delete anyone’s messages within the space.
- Export channel history (even if not a channel member).

## Space-Level Permissions
- View space details: Allowed if `is_public` or `allow_spectator`; otherwise requires an invite token match, membership, or being the owner.
- Join space: Allowed when `is_public`, when the invite token matches, or for the owner; join as admin if owner, otherwise member.
- Invitation token (get/refresh): Admins only.
- Edit space metadata/settings: Admins or owner; only the owner can grant/revoke admin status during edits.
- Kick member from space: Admins or owner; only the owner can kick another admin.
- Delete space: Owner only.
- Real-time updates (events/WebSocket): Allowed for public/spectator spaces without membership; private spaces require authentication and membership or ownership.

## Channel-Level Permissions
- List/query members: Public channels allow guests; private channels require channel membership or being the space owner (owner bypass not applied everywhere; see messaging section).
- Create channel: Space admins only; creator joins as channel master.
- Edit channel (name/topic/type/privacy/etc.): Space admins only. Channel topic can also be edited by channel masters.
- Manage channel masters: Space admins can grant/revoke `is_master`.
- Join channel: Space members only; private channels reject non-members unless the user is the space owner. Joining a private channel still requires space membership.
- Add member to channel: Any existing channel member who is also a space member can add another space member.
- Kick from channel: Space admins or channel masters.
- Delete channel: Space admins only.
- Export channel history: Space admins or channel members; if not a master, whispered content stays hidden.

## Messaging Permissions
- Send message: Requires channel membership (which implies space membership).
- Edit message: Requires channel membership. In non-document channels, only the sender may edit; in document channels, any channel member may edit.
- Move message: Channel membership required. In non-document channels, only the sender or a channel master may move others’ messages; document channels allow any member.
- Delete message: Sender or any space admin.
- Toggle fold: Channel membership required. In non-document channels, only the sender or a channel master; document channels allow any member.
- Read messages: Private channels require channel membership (no owner bypass here); public channels can be read without authentication.
