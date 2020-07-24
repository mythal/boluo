import { Channel } from './channels';
import { Id } from '../utils/id';

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
  password: string | null;
  description: string;
  defaultDiceType: string | null;
  firstChannelName: string;
}

export interface EditSpace {
  spaceId: Id;
  name?: string;
  description?: string;
  defaultDiceType: string | null;
}

export interface SpaceWithRelated {
  space: Space;
  members: SpaceMember[];
  channels: Channel[];
}

export interface CheckName {
  name: string;
}
