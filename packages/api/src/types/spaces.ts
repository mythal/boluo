import type { CreateSpace } from '@boluo/server-bindings/CreateSpace.js';
import type { EditSpace } from '@boluo/server-bindings/EditSpace.js';
import type { KickFromSpace } from '@boluo/server-bindings/KickFromSpace.js';
import type { SearchParams } from '@boluo/server-bindings/SearchParams.js';
import type { Space } from '@boluo/server-bindings/Space.js';
import type { SpaceMember } from '@boluo/server-bindings/SpaceMember.js';
import type { SpaceMemberWithUser } from '@boluo/server-bindings/SpaceMemberWithUser.js';
import type { SpaceWithMember } from '@boluo/server-bindings/SpaceWithMember.js';
import type { SpaceWithRelated } from '@boluo/server-bindings/SpaceWithRelated.js';
import type { StatusKind } from '@boluo/server-bindings/StatusKind.js';
import type { UserStatus } from '@boluo/server-bindings/UserStatus.js';
import type { Id } from '@boluo/utils';

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
