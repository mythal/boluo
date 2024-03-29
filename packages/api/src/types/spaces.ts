import type { CreateSpace } from '@boluo/server-bindings/CreateSpace';
import type { EditSpace } from '@boluo/server-bindings/EditSpace';
import type { KickFromSpace } from '@boluo/server-bindings/KickFromSpace';
import type { SearchParams } from '@boluo/server-bindings/SearchParams';
import type { Space } from '@boluo/server-bindings/Space';
import type { SpaceMember } from '@boluo/server-bindings/SpaceMember';
import type { SpaceMemberWithUser } from '@boluo/server-bindings/SpaceMemberWithUser';
import type { SpaceWithMember } from '@boluo/server-bindings/SpaceWithMember';
import type { SpaceWithRelated } from '@boluo/server-bindings/SpaceWithRelated';
import type { StatusKind } from '@boluo/server-bindings/StatusKind';
import type { UserStatus } from '@boluo/server-bindings/UserStatus';
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
