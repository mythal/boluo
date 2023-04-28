import type { MoveMessageBetween } from 'server-bindings/MoveMessageBetween';
import type { Empty } from 'utils';
import type { AppResponse } from './request';
import type { Channel, ChannelMembers, ChannelWithMember, CreateChannel, JoinChannel } from './types/channels';
import type { EditMessage, GetMessagesByChannel, Message, NewMessage } from './types/messages';
import type {
  CreateSpace,
  EditSpace,
  Space,
  SpaceMember,
  SpaceMemberWithUser,
  SpaceWithMember,
  SpaceWithRelated,
} from './types/spaces';
import type {
  CheckEmail,
  CheckUsername,
  EditUser,
  GetMe,
  LoginData,
  LoginReturn,
  RegisterData,
  User,
} from './types/users';

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
}

export interface Put {
}

export interface Patch {
  '/users/update_settings': { payload: object; query: null; result: object };
  '/messages/edit': { payload: EditMessage; query: null; result: Message };
}

export type { AppResponse };
export { editAvatar, get, mediaHead, mediaUrl, patch, post, upload } from './browser';
export { appFetch } from './common';
export * from './error-types';
export * from './errors';
export { makeUri } from './request';
export * from './types/channels';
export * from './types/events';
export * from './types/id';
export * from './types/messages';
export * from './types/preview';
export * from './types/spaces';
export * from './types/users';
