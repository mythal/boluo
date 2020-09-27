import { Channel } from './channels';
import { Id } from '../utils/id';
import { User } from './users';

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
}

export interface SpaceWithRelated {
  space: Space;
  members: SpaceMemberWithUser[];
  channels: Channel[];
}

export interface SpaceMemberWithUser {
  space: SpaceMember;
  user: User;
}

export interface Kick {
  spaceId: Id;
  userId: Id;
}
