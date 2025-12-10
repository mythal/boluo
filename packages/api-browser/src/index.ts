import { appFetch, type Get, makeUri, type Patch, type Post } from '@boluo/api';
import { atom } from 'jotai';
import { store } from '@boluo/store';
import type { Result } from '@boluo/utils/result';
import { isCrossOrigin } from '@boluo/utils/browser';
import { type ApiError } from '@boluo/api/errors';
import type { LoginReturn, Media, User } from '@boluo/types/bindings';
import { originMap } from '@boluo/api/origin-map';

export const backendUrlAtom = atom('');

let warningShown = false;

export const getDefaultBaseUrl = (): string => {
  const origin = window.location.origin;
  for (const [key, value] of Object.entries(originMap)) {
    if (origin.endsWith(key)) {
      return value;
    }
  }
  if (!warningShown) {
    console.warn('Unknown origin, using location.origin', origin);
    warningShown = true;
  }
  return origin;
};

export const apiUrlAtom = atom((get) => {
  const url = get(backendUrlAtom).trim() || '';
  if (url === '') {
    return `${getDefaultBaseUrl()}/api`;
  } else if (url.endsWith('/api')) {
    return url;
  } else if (url.endsWith('/')) {
    return url + 'api';
  } else {
    return url + '/api';
  }
});

const TOKEN_KEY = 'BOLUO_TOKEN_V1';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function addToken(params: RequestInit): RequestInit {
  const headers = new Headers(params.headers || {});
  if (isCrossOrigin()) {
    headers.set('X-Debug', '1');
  }
  const token = getToken();
  if (token) {
    headers.set('Authorization', token);
  }
  // headers.set('Authorization', `Bearer ${token}`);
  return { ...params, headers };
}

export function setToken(token: unknown): void {
  if (typeof token !== 'string') {
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

export function get<P extends keyof Get>(
  path: P,
  query: Get[P]['query'],
  apiUrl?: string,
): Promise<Result<Get[P]['result'], ApiError>> {
  const baseUrl = apiUrl || store.get(apiUrlAtom);
  const url = makeUri(baseUrl, path, query);

  const params: RequestInit = addToken({ credentials: 'include' });
  return appFetch(url, params);
}

const headers = new Headers({
  'Content-Type': 'application/json',
});

export async function post<P extends keyof Post>(
  path: P,
  query: Post[P]['query'],
  payload: Post[P]['payload'],
): Promise<Result<Post[P]['result'], ApiError>> {
  const baseUrl = store.get(apiUrlAtom);
  const url = makeUri(baseUrl, path, query);
  const params: RequestInit = addToken({
    credentials: 'include',
    headers,
    cache: 'no-cache',
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return appFetch(url, params);
}

export async function login(
  username: string,
  password: string,
): Promise<Result<LoginReturn, ApiError>> {
  const withToken = isCrossOrigin();
  const result = await post('/users/login', null, { password, username, withToken });
  if (result.isOk && result.some.token) {
    setToken(result.some.token);
  }
  return result;
}

export function patch<P extends keyof Patch>(
  path: P,
  query: Patch[P]['query'],
  payload: Patch[P]['payload'],
): Promise<Result<Patch[P]['result'], ApiError>> {
  const baseUrl = store.get(apiUrlAtom);
  const url = makeUri(baseUrl, path, query);
  const params: RequestInit = addToken({
    credentials: 'include',
    headers,
    cache: 'no-cache',
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return appFetch(url, params);
}

export function mediaUrl(id: string, download = false): string {
  const baseUrl = store.get(apiUrlAtom);
  return makeUri(baseUrl, '/media/get', { download, id });
}

export function mediaHead(id: string): Promise<Response> {
  const baseUrl = store.get(apiUrlAtom);
  const url = makeUri(baseUrl, '/media/get', { id });
  return fetch(
    url,
    addToken({
      method: 'HEAD',
      credentials: 'include',
    }),
  );
}

export function upload(
  file: Blob,
  filename: string,
  mimeType: string,
  path = '/media/upload',
): Promise<Result<Media, ApiError>> {
  const baseUrl = store.get(apiUrlAtom);
  const url = makeUri(baseUrl, path, { filename, mimeType });

  const params: RequestInit = addToken({
    credentials: 'include',
    headers,
    cache: 'no-cache',
    method: 'POST',
    body: file,
  });
  return appFetch(url, params);
}

export function editAvatar(file: File): Promise<Result<User, ApiError>> {
  const baseUrl = store.get(apiUrlAtom);
  const path = '/users/edit_avatar';
  const url = makeUri(baseUrl, path, { filename: file.name, mimeType: file.type });

  const params: RequestInit = addToken({
    credentials: 'include',
    headers,
    cache: 'no-cache',
    method: 'POST',
    body: file,
  });
  return appFetch(url, params);
}
