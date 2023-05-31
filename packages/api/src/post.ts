import type { MoveMessageBetween } from 'server-bindings/MoveMessageBetween';
import type { Empty } from 'utils';
import type { Channel, ChannelWithMember, CreateChannel, EditChannel, JoinChannel } from './types/channels';
import type { Message, NewMessage } from './types/messages';
import type { CreateSpace, EditSpace, Space, SpaceWithMember } from './types/spaces';
import type { EditUser, LoginData, LoginReturn, RegisterData, User } from './types/users';

export interface Post {
  // users
  '/users/login': { payload: LoginData; query: null; result: LoginReturn };
  '/users/register': { payload: RegisterData; query: null; result: User };
  '/users/edit': { payload: Partial<EditUser>; query: null; result: User };
  '/users/remove_avatar': { payload: null; query: null; result: User };
  // spaces
  '/spaces/create': { payload: CreateSpace; query: null; result: SpaceWithMember };
  '/spaces/edit': { payload: EditSpace; query: null; result: Space };
  '/spaces/delete': { payload: Empty; query: { id: string }; result: Space };
  '/spaces/refresh_token': { payload: Empty; query: { id: string }; result: string };
  '/spaces/join': { payload: Empty; result: SpaceWithMember; query: { spaceId: string; token?: string } };
  // messages
  '/messages/send': { payload: NewMessage; query: null; result: Message };
  '/messages/move_between': { payload: MoveMessageBetween; query: null; result: Message };
  '/messages/delete': { payload: Empty; query: { id: string }; result: Message };
  '/messages/toggle_fold': { payload: Empty; query: { id: string }; result: Message };
  // channels
  '/channels/create': { payload: CreateChannel; query: null; result: ChannelWithMember };
  '/channels/join': { payload: JoinChannel; query: null; result: ChannelWithMember };
  '/channels/leave': { payload: Empty; query: { id: string }; result: true };
  '/channels/edit': { payload: EditChannel; query: null; result: Channel };
}
