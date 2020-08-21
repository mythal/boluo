/* eslint-disable @typescript-eslint/ban-types */
import { Err, Ok, Result } from '../utils/result';
import { AppError, notJson } from './error';
import { getCsrfToken } from './csrf';
import { CheckEmail, CheckUsername, EditUser, GetMe, LoginData, LoginResult, RegisterData, User } from './users';
import {
  CheckSpaceName,
  CreateSpace,
  EditSpace,
  Space,
  SpaceMember,
  SpaceWithMember,
  SpaceWithRelated,
} from './spaces';
import {
  Channel,
  ChannelMember,
  ChannelWithMember,
  ChannelWithRelated,
  CheckChannelName,
  CreateChannel,
  EditChannel,
  EditChannelMember,
  JoinChannel,
} from './channels';
import { ByChannel, EditMessage, Message, SwapMessage, MoveTo, NewMessage } from './messages';
import { Id } from '../utils/id';
import { Media } from './media';

export type AppResult<T> = Result<T, AppError>;

export interface ApiOk<T> {
  isOk: true;
  ok: T;
}

export interface ApiErr<E> {
  isOk: false;
  err: E;
}

export type ApiResultObject<T, E> = ApiOk<T> | ApiErr<E>;

const toResult = <T, E>(apiResult: ApiOk<T> | ApiErr<E>): Result<T, E> => {
  if (apiResult.isOk) {
    return new Ok(apiResult.ok);
  } else {
    return new Err(apiResult.err);
  }
};

export const request = async <T>(
  path: string,
  method: string,
  body: RequestInit['body'],
  csrf = true,
  contentType = 'application/json'
): Promise<AppResult<T>> => {
  const headers = new Headers({
    'Content-Type': contentType,
  });
  if (csrf) {
    headers.append('csrf-token', await getCsrfToken());
  }
  const result = await fetch(path, {
    method,
    headers,
    body,
    credentials: 'include',
  });
  try {
    return toResult<T, AppError>(await result.json());
  } catch (e) {
    return new Err(notJson);
  }
};

export const makeUri = (path: string, query?: object): string => {
  if (path[0] !== '/') {
    path = '/api/' + path;
  } else {
    path = '/api' + path;
  }
  if (query === undefined) {
    return path;
  }
  const entities = Object.entries(query);
  if (entities.length === 0) {
    return path;
  }
  const searchParams = new URLSearchParams();
  for (const entry of entities) {
    const [key, value] = entry;
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
      searchParams.set(key, String(value));
    }
  }
  return `${path}?${searchParams}`;
};

interface IdQuery {
  id: Id;
}

export function post(path: '/users/login', payload: LoginData): Promise<AppResult<LoginResult>>;
export function post(path: '/users/register', payload: RegisterData): Promise<AppResult<User>>;
export function post(path: '/users/edit', payload: EditUser): Promise<AppResult<User>>;
export function post(path: '/spaces/create', payload: CreateSpace): Promise<AppResult<SpaceWithMember>>;
export function post(path: '/spaces/edit', payload: EditSpace): Promise<AppResult<Space>>;
export function post(path: '/spaces/join', payload: {}, query: IdQuery): Promise<AppResult<SpaceWithMember>>;
export function post(path: '/spaces/leave', payload: {}, query: IdQuery): Promise<AppResult<true>>;
export function post(path: '/spaces/delete', payload: {}, query: IdQuery): Promise<AppResult<Space>>;
export function post(path: '/channels/create', payload: CreateChannel): Promise<AppResult<ChannelWithMember>>;
export function post(path: '/channels/edit', payload: EditChannel): Promise<AppResult<Channel>>;
export function post(path: '/channels/edit_member', payload: EditChannelMember): Promise<AppResult<ChannelMember>>;
export function post(path: '/channels/join', payload: JoinChannel): Promise<AppResult<ChannelWithMember>>;
export function post(path: '/channels/leave', payload: {}, query: IdQuery): Promise<AppResult<true>>;
export function post(path: '/channels/delete', payload: {}, query: IdQuery): Promise<AppResult<Channel>>;
export function post(path: '/messages/send', payload: NewMessage): Promise<AppResult<Message>>;
export function post(path: '/messages/delete', payload: {}, query: IdQuery): Promise<AppResult<Message>>;
export function post(path: '/messages/toggle_fold', payload: {}, query: IdQuery): Promise<AppResult<Message>>;
export function post(path: '/messages/swap', payload: {}, query: SwapMessage): Promise<AppResult<true>>;
export function post(path: '/messages/move_to', payload: MoveTo): Promise<AppResult<true>>;
export function post<T, U extends object = object, Q extends object = {}>(
  path: string,
  payload: U,
  query?: Q,
  csrf = true
): Promise<AppResult<T>> {
  return request(makeUri(path, query), 'POST', JSON.stringify(payload), csrf);
}

export function patch(path: '/messages/edit', payload: EditMessage): Promise<AppResult<Message>>;
export function patch<T, U extends object = object, Q extends object = {}>(
  path: string,
  payload: U,
  query?: Q,
  csrf = true
): Promise<AppResult<T>> {
  return request(makeUri(path, query), 'PATCH', JSON.stringify(payload), csrf);
}

export function get(path: '/users/query', query: { id?: Id }): Promise<AppResult<User>>;
export function get(path: '/users/get_me'): Promise<AppResult<GetMe | null>>;
export function get(path: '/users/logout'): Promise<AppResult<true>>;
export function get(path: '/users/check_username', query: CheckUsername): Promise<AppResult<boolean>>;
export function get(path: '/users/check_email', query: CheckEmail): Promise<AppResult<boolean>>;
export function get(path: '/spaces/list'): Promise<AppResult<Space[]>>;
export function get(path: '/spaces/query', query: IdQuery): Promise<AppResult<Space>>;
export function get(path: '/spaces/query_with_related', query: IdQuery): Promise<AppResult<SpaceWithRelated>>;
export function get(path: '/spaces/members', query: IdQuery): Promise<AppResult<SpaceMember[]>>;
export function get(path: '/spaces/check_name', query: CheckSpaceName): Promise<AppResult<boolean>>;
export function get(path: '/channels/query', query: IdQuery): Promise<AppResult<Channel>>;
export function get(path: '/channels/query_with_related', query: IdQuery): Promise<AppResult<ChannelWithRelated>>;
export function get(path: '/channels/by_space', query: IdQuery): Promise<AppResult<Channel[]>>;
export function get(path: '/channels/members', query: IdQuery): Promise<AppResult<ChannelMember[]>>;
export function get(path: '/channels/check_name', query: CheckChannelName): Promise<AppResult<boolean>>;
export function get(path: '/messages/query', query: IdQuery): Promise<AppResult<Message | null>>;
export function get(path: '/messages/by_channel', query: ByChannel): Promise<AppResult<Message[]>>;

export function get<Q extends object, T>(path: string, query?: Q): Promise<AppResult<T>> {
  return request(makeUri(path, query), 'GET', null, false);
}

export function editAvatar(file: Blob, filename: string, mimeType: string): Promise<AppResult<User>> {
  const path = '/users/edit_avatar';
  return request(makeUri(path, { filename, mimeType }), 'POST', file, true, mimeType);
}

export function upload(
  file: Blob,
  filename: string,
  mimeType: string,
  path = '/media/upload'
): Promise<AppResult<Media>> {
  return request(makeUri(path, { filename, mimeType }), 'POST', file, true, mimeType);
}

export function mediaUrl(id: string, download = false): string {
  return makeUri('/media/get', { id, download });
}
