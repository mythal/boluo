/* eslint-disable @typescript-eslint/no-empty-object-type */
import { isCrossOrigin } from '../settings';
import store from '../store';
import { Err, Ok, type Result } from '../utils/result';
import { getAuthToken, clearAuthToken } from '../utils/token';
import type {
  IdQuery,
  IdWithToken,
  KickFromChannel,
  MakeToken,
  MoveMessageBetween,
  QueryUser,
} from '@boluo/api';
import {
  type AddMember,
  type Channel,
  type ChannelMember,
  type ChannelMemberWithUser,
  type ChannelWithMaybeMember,
  type ChannelWithMember,
  type ChannelWithRelated,
  type CheckChannelName,
  type CreateChannel,
  type EditChannel,
  type EditChannelMember,
  type Export,
  type JoinChannel,
} from './channels';
import { type AppError, FETCH_FAIL, notJson, UNAUTHENTICATED } from './error';
import { type Media, type PreSign, type PreSignResult } from './media';
import {
  type ByChannel,
  type EditMessage,
  type Message,
  type MoveTo,
  type NewMessage,
} from './messages';
import {
  type CreateSpace,
  type EditSpace,
  type Kick,
  type SearchParams,
  type Space,
  type SpaceIdWithToken,
  type SpaceMemberWithUser,
  type SpaceWithMember,
  type SpaceWithRelated,
} from './spaces';
import {
  type CheckEmail,
  type CheckUsername,
  type EditUser,
  type LoginData,
  type LoginResult,
  type RegisterData,
  type ResetPassword,
  type ResetPasswordConfirm,
  type ResetPasswordTokenCheck,
  type Settings,
  type User,
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

  const token = getAuthToken();
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  let result: Response;
  try {
    result = await fetch(path, {
      method,
      headers,
      body,
      credentials: token ? 'omit' : 'include',
    });
  } catch (e) {
    return new Err({
      code: FETCH_FAIL,
      message: e instanceof Error ? e.message : 'Unknown error',
      context: null,
    });
  }
  let resultJson: unknown = null;
  try {
    resultJson = await result.json();
  } catch (e) {
    return new Err(notJson);
  }
  const appResult = toResult<T, AppError>(resultJson as ApiOk<T> | ApiErr<AppError>);
  if (appResult.isErr && appResult.value.code === UNAUTHENTICATED) {
    if (token) {
      clearAuthToken();
    }
    await get('/users/logout');
    location.replace('/login');
  }
  return appResult;
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
  const entities: [string, unknown][] = Object.entries(query);
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
  return `${path}?${searchParams.toString()}`;
};

export function post(path: '/users/login', payload: LoginData): Promise<AppResult<LoginResult>>;
export function post(path: '/users/register', payload: RegisterData): Promise<AppResult<User>>;
export function post(path: '/users/edit', payload: Partial<EditUser>): Promise<AppResult<User>>;
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
  query: KickFromChannel,
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
  payload: MoveMessageBetween,
): Promise<AppResult<Message>>;
export function post(
  path: '/media/presigned',
  payload: {},
  query: PreSign,
): Promise<AppResult<PreSignResult>>;
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

export function get(path: '/users/query', query: QueryUser): Promise<AppResult<User | null>>;
export function get(path: '/users/settings'): Promise<AppResult<Settings>>;
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
export function get(path: '/spaces/my'): Promise<AppResult<SpaceWithMember[]>>;
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
): Promise<AppResult<ChannelWithMaybeMember[]>>;
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
  query: MakeToken,
): Promise<AppResult<{ token: string; issuedAt: number }>>;

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

export async function uploadWithPresigned(
  file: Blob,
  filename: string,
  mimeType: string,
): Promise<AppResult<{ mediaId: string }>> {
  const presignQuery: PreSign = {
    filename,
    mimeType,
    size: file.size,
  };

  const presignResult = await post('/media/presigned', {}, presignQuery);
  if (!presignResult.isOk) {
    return new Err(presignResult.value);
  }

  const { url, mediaId } = presignResult.value;
  try {
    const uploadResponse = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': mimeType,
      },
    });

    if (!uploadResponse.ok) {
      return new Err({
        code: FETCH_FAIL,
        message: `S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
        context: null,
      });
    }

    return new Ok({ mediaId });
  } catch (e) {
    return new Err({
      code: FETCH_FAIL,
      message: e instanceof Error ? e.message : 'S3 upload failed',
      context: null,
    });
  }
}
