import { type Id } from '../utils/id';
import { type Channel, type ChannelMember } from './channels';
import { type User } from './users';

export interface SpaceIdWithToken {
  spaceId: Id;
  token?: string;
}

export interface Space {
  id: Id;
  name: string;
  description: string;
  created: string;
  modified: string;
  ownerId: Id;
  isPublic: boolean;
  language: string;
  defaultDiceType: string;
  explorable: boolean;
  allowSpectator: boolean;
}

export interface SpaceMember {
  userId: Id;
  spaceId: Id;
  isAdmin: boolean;
  joinDate: string;
}

export interface SpaceWithMember {
  space: Space;
  member: SpaceMember;
}

export interface CreateSpace {
  name: string;
  description: string;
  defaultDiceType: string | undefined;
  firstChannelName: string;
}

export interface SearchParams {
  search: string;
}

export interface EditSpace {
  spaceId: Id;
  name?: string;
  description?: string;
  defaultDiceType: string | undefined;
  explorable?: boolean;
  isPublic?: boolean;
  allowSpectator?: boolean;
}

export type StatusKind = 'OFFLINE' | 'AWAY' | 'ONLINE';

export interface UserStatus {
  timestamp: number;
  kind: StatusKind;
}

export interface SpaceWithRelated {
  space: Space;
  members: Record<Id, SpaceMemberWithUser | undefined>;
  channels: Channel[];
  channelMembers: Record<Id, ChannelMember[] | undefined>;
  usersStatus: Record<Id, UserStatus>;
}

export interface SpaceMemberWithUser {
  space: SpaceMember;
  user: User;
}

export interface Kick {
  spaceId: Id;
  userId: Id;
}
