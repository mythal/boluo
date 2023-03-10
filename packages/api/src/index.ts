import type { MoveMessageBetween } from 'server-bindings/MoveMessageBetween';
import type { Empty } from 'utils';
import type { AppResponse } from './request';
import type { Channel, ChannelWithMember, CreateChannel } from './types/channels';
import type { GetMessagesByChannel, Message, NewMessage } from './types/messages';
import type { CreateSpace, EditSpace, Space, SpaceWithMember, SpaceWithRelated } from './types/spaces';
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
  // channels
  '/channels/query': { query: { id: string }; result: Channel };
  '/channels/by_space': { query: { id: string }; result: Channel[] };
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
  // messages
  '/messages/send': { payload: NewMessage; query: null; result: Message };
  '/messages/move_between': { payload: MoveMessageBetween; query: null; result: Message };
  // channels
  '/channels/create': { payload: CreateChannel; query: null; result: ChannelWithMember };
}

export interface Put {
}

export interface Patch {
  // users
  '/users/update_settings': { payload: object; query: null; result: object };
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
