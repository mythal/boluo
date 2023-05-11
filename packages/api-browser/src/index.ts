import { ApiError, appFetch, Get, makeUri, Media, Patch, Post, User } from 'api';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { store } from 'store';
import type { Result } from 'utils';

const isBrowser = typeof window !== 'undefined';

export const DEFAULT_BACKEND_URL = isBrowser ? window.location.origin : process.env.BACKEND_URL || '';

export const backendUrlAtom = atomWithStorage('BOLUO_BACKEND_API_URL', DEFAULT_BACKEND_URL);

export const apiUrlAtom = atom((get) => {
  const url = get(backendUrlAtom);
  if (url.endsWith('/api')) {
    return url;
  } else if (url.endsWith('/')) {
    return url + 'api';
  } else {
    return url + '/api';
  }
});

export async function get<P extends keyof Get>(
  path: P,
  query: Get[P]['query'],
  apiUrl?: string,
): Promise<Result<Get[P]['result'], ApiError>> {
  const baseUrl = apiUrl || store.get(apiUrlAtom);
  const url = makeUri(baseUrl, path, query);

  const params: RequestInit = { credentials: 'include' };
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
  const params: RequestInit = {
    credentials: 'include',
    headers,
    cache: 'no-cache',
    method: 'POST',
    body: JSON.stringify(payload),
  };
  return appFetch(url, params);
}

export async function patch<P extends keyof Patch>(
  path: P,
  query: Patch[P]['query'],
  payload: Patch[P]['payload'],
): Promise<Result<Patch[P]['result'], ApiError>> {
  const baseUrl = store.get(apiUrlAtom);
  const url = makeUri(baseUrl, path, query);
  const params: RequestInit = {
    credentials: 'include',
    headers,
    cache: 'no-cache',
    method: 'PATCH',
    body: JSON.stringify(payload),
  };
  return appFetch(url, params);
}

export function mediaUrl(id: string, download = false): string {
  const baseUrl = store.get(apiUrlAtom);
  return makeUri(baseUrl, '/media/get', { download, id });
}

export function mediaHead(id: string): Promise<Response> {
  const baseUrl = store.get(apiUrlAtom);
  const url = makeUri(baseUrl, '/media/get', { id });
  return fetch(url, {
    method: 'HEAD',
    credentials: 'include',
  });
}

export function upload(
  file: Blob,
  filename: string,
  mimeType: string,
  path = '/media/upload',
): Promise<Result<Media, ApiError>> {
  const baseUrl = store.get(apiUrlAtom);
  const url = makeUri(baseUrl, path, { filename, mimeType });

  const params: RequestInit = {
    credentials: 'include',
    headers,
    cache: 'no-cache',
    method: 'POST',
    body: file,
  };
  return appFetch(url, params);
}

export function editAvatar(
  file: File,
): Promise<Result<User, ApiError>> {
  const baseUrl = store.get(apiUrlAtom);
  const path = '/users/edit_avatar';
  const url = makeUri(baseUrl, path, { filename: file.name, mimeType: file.type });

  const params: RequestInit = {
    credentials: 'include',
    headers,
    cache: 'no-cache',
    method: 'POST',
    body: file,
  };
  return appFetch(url, params);
}
