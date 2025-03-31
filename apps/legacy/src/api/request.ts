import { isCrossOrigin } from '../settings';
import store from '../store';
import { Id } from '../utils/id';
import { Err, Ok, Result } from '../utils/result';
import {
  AddMember,
  Channel,
  ChannelMember,
  ChannelMembers,
  ChannelMemberWithUser,
  ChannelWithMember,
  ChannelWithRelated,
  CheckChannelName,
  CreateChannel,
  EditChannel,
  EditChannelMember,
  Export,
  JoinChannel,
} from './channels';
import { AppError, notJson, UNAUTHENTICATED } from './error';
import { Media } from './media';
import { ByChannel, EditMessage, Message, MoveBetween, MoveTo, NewMessage } from './messages';
import {
  CreateSpace,
  EditSpace,
  Kick,
  SearchParams,
  Space,
  SpaceIdWithToken,
  SpaceMemberWithUser,
  SpaceWithMember,
  SpaceWithRelated,
} from './spaces';
import {
  CheckEmail,
  CheckUsername,
  EditUser,
  GetMe,
  LoginData,
  LoginResult,
  RegisterData,
  ResetPassword,
  ResetPasswordConfirm,
  ResetPasswordTokenCheck,
  Settings,
  User,
} from './users';

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
  contentType = 'application/json',
): Promise<AppResult<T>> => {
  const headers = new Headers({
    'Content-Type': contentType,
  });
  if (isCrossOrigin) {
    headers.append('X-Debug', '1');
  }

  const result = await fetch(path, {
    method,
    headers,
    body,
    credentials: 'include',
  });
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const appResult = toResult<T, AppError>(await result.json());
    if (appResult.isErr && appResult.value.code === UNAUTHENTICATED) {
      location.replace('/login');
    }
    return appResult;
  } catch (e) {
    return new Err(notJson);
  }
};

export const makeUri = (path: string, query?: object, addBaseUrl = true): string => {
  let baseUrl = '';
  if (addBaseUrl) {
    baseUrl = store.getState().ui.baseUrl;
  }
  if (path[0] !== '/') {
    path = '/api/' + path;
  } else {
    path = '/api' + path;
  }
  path = baseUrl + path;
  if (query === undefined) {
    return path;
  }
  const entities = Object.entries(query);
  if (entities.length === 0) {
    return path;
  }
  const searchParams = new URLSearchParams();
  for (const entry of entities) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [key, value] = entry;
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
      searchParams.set(key, String(value));
    }
  }
  return `${path}?${searchParams.toString()}`;
};

interface IdQuery {
  id: Id;
}

interface IdWithToken {
  id: Id;
  token?: string;
}

export function post(path: '/users/login', payload: LoginData): Promise<AppResult<LoginResult>>;
export function post(path: '/users/register', payload: RegisterData): Promise<AppResult<User>>;
export function post(path: '/users/edit', payload: EditUser): Promise<AppResult<User>>;
export function post(
  path: '/users/update_settings',
  payload: Settings,
): Promise<AppResult<Settings>>;
export function post(
  path: '/users/reset_password',
  payload: ResetPassword,
): Promise<AppResult<null>>;
export function post(
  path: '/users/reset_password_confirm',
  payload: ResetPasswordConfirm,
): Promise<AppResult<null>>;
export function post(
  path: '/spaces/create',
  payload: CreateSpace,
): Promise<AppResult<SpaceWithMember>>;
export function post(path: '/spaces/edit', payload: EditSpace): Promise<AppResult<Space>>;
export function post(
  path: '/spaces/join',
  payload: {},
  query: SpaceIdWithToken,
): Promise<AppResult<SpaceWithMember>>;
export function post(path: '/spaces/leave', payload: {}, query: IdQuery): Promise<AppResult<true>>;
export function post(path: '/spaces/kick', payload: {}, query: Kick): Promise<AppResult<true>>;
export function post(
  path: '/spaces/delete',
  payload: {},
  query: IdQuery,
): Promise<AppResult<Space>>;
export function post(
  path: '/channels/create',
  payload: CreateChannel,
): Promise<AppResult<ChannelWithMember>>;
export function post(path: '/channels/edit', payload: EditChannel): Promise<AppResult<Channel>>;
export function post(
  path: '/channels/edit_member',
  payload: EditChannelMember,
): Promise<AppResult<ChannelMember>>;
export function post(
  path: '/channels/join',
  payload: JoinChannel,
): Promise<AppResult<ChannelWithMember>>;
export function post(
  path: '/channels/add_member',
  payload: AddMember,
): Promise<AppResult<ChannelWithMember>>;
export function post(
  path: '/channels/leave',
  payload: {},
  query: IdQuery,
): Promise<AppResult<true>>;
export function post(
  path: '/channels/kick',
  payload: {},
  query: { channelId: string; userId: string; spaceId: string },
): Promise<AppResult<true>>;
export function post(
  path: '/channels/delete',
  payload: {},
  query: IdQuery,
): Promise<AppResult<Channel>>;
export function post(path: '/messages/send', payload: NewMessage): Promise<AppResult<Message>>;
export function post(
  path: '/messages/delete',
  payload: {},
  query: IdQuery,
): Promise<AppResult<Message>>;
export function post(
  path: '/messages/toggle_fold',
  payload: {},
  query: IdQuery,
): Promise<AppResult<Message>>;
export function post(path: '/messages/move_to', payload: MoveTo): Promise<AppResult<Message>>;
export function post(
  path: '/messages/move_between',
  payload: MoveBetween,
): Promise<AppResult<Message>>;
export function post<T, U extends object = object, Q extends object = {}>(
  path: string,
  payload: U,
  query?: Q,
): Promise<AppResult<T>> {
  return request(makeUri(path, query), 'POST', JSON.stringify(payload));
}

export function patch(path: '/messages/edit', payload: EditMessage): Promise<AppResult<Message>>;
export function patch<T, U extends object = object, Q extends object = {}>(
  path: string,
  payload: U,
  query?: Q,
): Promise<AppResult<T>> {
  return request(makeUri(path, query), 'PATCH', JSON.stringify(payload));
}

export function get(path: '/users/query', query: { id?: Id }): Promise<AppResult<User>>;
export function get(path: '/users/get_me'): Promise<AppResult<GetMe | null>>;
export function get(path: '/users/logout'): Promise<AppResult<true>>;
export function get(
  path: '/users/check_username',
  query: CheckUsername,
): Promise<AppResult<boolean>>;
export function get(path: '/users/check_email', query: CheckEmail): Promise<AppResult<boolean>>;
export function get(
  path: '/users/reset_password_token_check',
  query: ResetPasswordTokenCheck,
): Promise<AppResult<boolean>>;
export function get(path: '/spaces/list'): Promise<AppResult<Space[]>>;
export function get(path: '/spaces/search', query: SearchParams): Promise<AppResult<Space[]>>;
export function get(path: '/spaces/query', query: IdQuery): Promise<AppResult<Space>>;
export function get(
  path: '/spaces/query_with_related',
  query: IdWithToken,
): Promise<AppResult<SpaceWithRelated>>;
export function get(path: '/spaces/token', query: IdQuery): Promise<AppResult<string>>;
export function get(
  path: '/spaces/members',
  query: IdQuery,
): Promise<AppResult<Record<string, SpaceMemberWithUser>>>;
export function get(path: '/channels/query', query: IdQuery): Promise<AppResult<Channel>>;
export function get(
  path: '/channels/query_with_related',
  query: IdQuery,
): Promise<AppResult<ChannelWithRelated>>;
export function get(
  path: '/channels/by_space',
  query: IdQuery,
): Promise<AppResult<Array<{ channel: Channel; member: ChannelMember | null }>>>;
export function get(
  path: '/channels/all_members',
  query: IdQuery,
): Promise<AppResult<ChannelMemberWithUser[]>>;
export function get(
  path: '/channels/check_name',
  query: CheckChannelName,
): Promise<AppResult<boolean>>;
export function get(path: '/channels/export', query: Export): Promise<AppResult<Message[]>>;
export function get(path: '/messages/query', query: IdQuery): Promise<AppResult<Message | null>>;
export function get(path: '/messages/by_channel', query: ByChannel): Promise<AppResult<Message[]>>;
export function get(
  path: '/events/token',
  query: IdQuery,
): Promise<AppResult<{ token: string | null }>>;

export function get<Q extends object, T>(path: string, query?: Q): Promise<AppResult<T>> {
  return request(makeUri(path, query), 'GET', null);
}

export function editAvatar(
  file: Blob,
  filename: string,
  mimeType: string,
): Promise<AppResult<User>> {
  const path = '/users/edit_avatar';
  return request(makeUri(path, { filename, mimeType, size: file.size }), 'POST', file, mimeType);
}

export function upload(
  file: Blob,
  filename: string,
  mimeType: string,
  path = '/media/upload',
): Promise<AppResult<Media>> {
  return request(makeUri(path, { filename, mimeType, size: file.size }), 'POST', file, mimeType);
}

export function mediaUrl(id: string, download = false, addBaseUrl = true): string {
  return makeUri('/media/get', { download, id }, addBaseUrl);
}

export function mediaHead(id: string): Promise<Response> {
  // https://stackoverflow.com/a/75115203
  return fetch(makeUri('/media/get', { id }), {
    method: 'HEAD',
    mode: 'cors',
    cache: 'no-store',
  });
}
