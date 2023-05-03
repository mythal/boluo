import type { Channel, ChannelMembers } from './types/channels';
import type { GetMessagesByChannel, Message } from './types/messages';
import type { Space, SpaceMember, SpaceMemberWithUser, SpaceWithMember, SpaceWithRelated } from './types/spaces';
import type { CheckEmail, CheckUsername, GetMe, User } from './types/users';

export interface Get {
  // users
  '/users/get_me': { query: null; result: GetMe | null };
  '/users/query': { query: { id: string }; result: User };
  '/users/logout': { query: null; result: true };
  '/users/settings': { query: null; result: unknown };
  '/users/check_username': { query: CheckUsername; result: boolean };
  '/users/check_email': { query: CheckEmail; result: boolean };
  // spaces
  '/spaces/query': { query: { id: string }; result: Space };
  '/spaces/my': { query: null; result: SpaceWithMember[] };
  '/spaces/query_with_related': { query: { id: string }; result: SpaceWithRelated };
  '/spaces/my_space_member': { query: { id: string }; result: SpaceMember | null };
  '/spaces/members': { query: { id: string }; result: Record<string, SpaceMemberWithUser> };
  '/spaces/token': { query: { id: string }; result: string };
  // channels
  '/channels/query': { query: { id: string }; result: Channel };
  '/channels/by_space': { query: { id: string }; result: Channel[] };
  '/channels/members': { query: { id: string }; result: ChannelMembers };
  // messages
  '/messages/by_channel': { query: GetMessagesByChannel; result: Message[] };
}
