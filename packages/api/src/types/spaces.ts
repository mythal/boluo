import type { Id } from 'boluo-utils';
import type { CreateSpace } from 'server-bindings/CreateSpace';
import type { EditSpace } from 'server-bindings/EditSpace';
import type { KickFromSpace } from 'server-bindings/KickFromSpace';
import type { SearchParams } from 'server-bindings/SearchParams';
import type { Space } from 'server-bindings/Space';
import type { SpaceMember } from 'server-bindings/SpaceMember';
import type { SpaceMemberWithUser } from 'server-bindings/SpaceMemberWithUser';
import type { SpaceWithMember } from 'server-bindings/SpaceWithMember';
import type { SpaceWithRelated } from 'server-bindings/SpaceWithRelated';
import type { StatusKind } from 'server-bindings/StatusKind';
import type { UserStatus } from 'server-bindings/UserStatus';

export interface SpaceIdWithToken {
  spaceId: Id;
  token?: string;
}

export {
  CreateSpace,
  EditSpace,
  KickFromSpace,
  SearchParams,
  Space,
  SpaceMember,
  SpaceMemberWithUser,
  SpaceWithMember,
  SpaceWithRelated,
  StatusKind,
  UserStatus,
};
