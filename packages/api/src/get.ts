import type { Channel, ChannelMembers, ChannelWithMaybeMember } from './types/channels';
import type { GetMessagesByChannel, Message } from './types/messages';
import type {
  Space,
  SpaceMember,
  SpaceMemberWithUser,
  SpaceWithMember,
  SpaceWithRelated,
  UserStatus,
} from './types/spaces';
import type { CheckEmail, CheckUsername, GetMe, User } from './types/users';

export interface Get {
  // users
  '/users/query': { query: { id: string | null }; result: User };
  '/users/query_self': { query: null; result: User | null };
  '/users/logout': { query: null; result: true };
  '/users/settings': { query: null; result: unknown };
  '/users/check_username': { query: CheckUsername; result: boolean };
  '/users/check_email': { query: CheckEmail; result: boolean };
  // spaces
  '/spaces/users_status': { query: { id: string }; result: Record<string, UserStatus> };
  '/spaces/query': { query: { id: string; token?: string }; result: Space };
  '/spaces/my': { query: null; result: SpaceWithMember[] };
  '/spaces/query_with_related': { query: { id: string }; result: SpaceWithRelated };
  '/spaces/my_space_member': { query: { id: string }; result: SpaceMember | null };
  '/spaces/members': { query: { id: string }; result: Record<string, SpaceMemberWithUser> };
  '/spaces/token': { query: { id: string }; result: string };
  '/spaces/settings': { query: { id: string }; result: unknown };
  // channels
  '/channels/query': { query: { id: string }; result: Channel };
  '/channels/by_space': { query: { id: string }; result: ChannelWithMaybeMember[] };
  '/channels/members': { query: { id: string }; result: ChannelMembers };
  '/channels/check_name': { query: { name: string; spaceId: string }; result: boolean };
  // messages
  '/messages/by_channel': { query: GetMessagesByChannel; result: Message[] };
  '/messages/query': { query: { id: string }; result: Message | null };
  // events
  '/events/token': { query: null; result: { token: string | null } };
}
