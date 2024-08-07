// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.
import type { Channel } from './Channel';
import type { ChannelMember } from './ChannelMember';
import type { Space } from './Space';
import type { SpaceMemberWithUser } from './SpaceMemberWithUser';
import type { UserStatus } from './UserStatus';

export type SpaceWithRelated = {
  space: Space;
  members: { [key: string]: SpaceMemberWithUser };
  channels: Array<Channel>;
  channelMembers: { [key: string]: Array<ChannelMember> };
  usersStatus: { [key: string]: UserStatus };
};
