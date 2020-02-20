import { Result, Ok, Err } from '../result';
import { AppError, notJson } from './error';
import { getCsrfToken } from './csrf';
import { EditUser, GetMe, LoginData, LoginResult, RegisterData, User } from './users';
import { CreateSpace, EditSpace, Space, SpaceMember, SpaceWithMember, SpaceWithRelated } from './spaces';
import { Id } from '../id';
import {
  Channel,
  ChannelMember,
  ChannelWithMember,
  ChannelWithRelated,
  CreateChannel,
  EditChannel,
  EditChannelMember,
  JoinChannel,
} from './channels';
import { EventQuery, ChannelEvent } from './events';
import { ByChannel, EditMessage, Message, NewMessage, NewPreview, Preview } from './messages';

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
  payload: object | null,
  csrf = true
): Promise<AppResult<T>> => {
  if (path[0] !== '/') {
    path = '/api/' + path;
  } else {
    path = '/api' + path;
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  if (csrf) {
    headers.append('csrf-token', await getCsrfToken());
  }
  let body: string | null;
  if (payload !== null) {
    body = JSON.stringify(payload);
  } else {
    body = null;
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

const makeUri = (path: string, query?: object): string => {
  if (query === undefined) {
    return path;
  }
  const entities = Object.entries(query);
  if (entities.length === 0) {
    return path;
  }
  const parts = [];
  for (const entry of entities) {
    const [key, value] = entry;
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return `${path}?${parts.join('&')}`;
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
export function post(
  path: '/channels/edit_member',
  payload: EditChannelMember
): Promise<AppResult<ChannelMember | null>>;
export function post(path: '/channels/join', payload: JoinChannel): Promise<AppResult<ChannelWithMember>>;
export function post(path: '/channels/leave', payload: {}, query: IdQuery): Promise<AppResult<true>>;
export function post(path: '/channels/delete', payload: {}, query: IdQuery): Promise<AppResult<Channel>>;
export function post(path: '/messages/send', payload: NewMessage): Promise<AppResult<Message>>;
export function post(path: '/messages/delete', payload: {}, query: IdQuery): Promise<AppResult<Message>>;
export function post(path: '/messages/edit', payload: EditMessage): Promise<AppResult<Message>>;
export function post(path: '/messages/preview', payload: NewPreview): Promise<AppResult<Preview>>;
export function post<T, U extends object = object, Q extends object = {}>(
  path: string,
  payload: U,
  query?: Q,
  csrf = true
): Promise<AppResult<T>> {
  return request(makeUri(path, query), 'POST', payload, csrf);
}

export function get(path: '/users/query', query: IdQuery): Promise<AppResult<User | null>>;
export function get(path: '/users/get_me'): Promise<AppResult<GetMe | null>>;
export function get(path: '/users/logout'): Promise<AppResult<true>>;
export function get(path: '/spaces/list'): Promise<AppResult<Space[]>>;
export function get(path: '/spaces/query', query: IdQuery): Promise<AppResult<Space>>;
export function get(path: '/spaces/query_with_related', query: IdQuery): Promise<AppResult<SpaceWithRelated>>;
export function get(path: '/spaces/members', query: IdQuery): Promise<AppResult<SpaceMember[]>>;
export function get(path: '/channels/query', query: IdQuery): Promise<AppResult<Channel>>;
export function get(path: '/channels/query_with_related', query: IdQuery): Promise<AppResult<ChannelWithRelated>>;
export function get(path: '/channels/by_space', query: IdQuery): Promise<AppResult<Channel[]>>;
export function get(path: '/channels/members', query: IdQuery): Promise<AppResult<ChannelMember[]>>;
export function get(path: '/events/subscribe', query: EventQuery): Promise<AppResult<ChannelEvent[]>>;
export function get(path: '/events/events', query: EventQuery): Promise<AppResult<ChannelEvent[]>>;
export function get(path: '/messages/query', query: IdQuery): Promise<AppResult<Message | null>>;
export function get(path: '/messages/by_channel', query: ByChannel): Promise<AppResult<Message[]>>;

export function get<Q extends object, T>(path: string, query?: Q): Promise<AppResult<T>> {
  return request(makeUri(path, query), 'GET', null, false);
}
