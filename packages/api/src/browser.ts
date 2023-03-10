import type { Result } from 'utils';
import type { ApiError, Get, Patch, Post, User } from '.';
import { appFetch } from './common';
import { makeUri } from './request';
import type { Media } from './types/media';

export async function get<P extends keyof Get>(
  baseUrl: string,
  path: P,
  query: Get[P]['query'],
): Promise<Result<Get[P]['result'], ApiError>> {
  const url = makeUri(baseUrl, path, query);

  const params: RequestInit = { credentials: 'include' };
  return appFetch(url, params);
}

const headers = new Headers({
  'Content-Type': 'application/json',
});

export async function post<P extends keyof Post>(
  baseUrl: string,
  path: P,
  query: Post[P]['query'],
  payload: Post[P]['payload'],
): Promise<Result<Post[P]['result'], ApiError>> {
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
  baseUrl: string,
  path: P,
  query: Patch[P]['query'],
  payload: Patch[P]['payload'],
): Promise<Result<Patch[P]['result'], ApiError>> {
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

export function mediaUrl(baseUrl: string, id: string, download = false): string {
  return makeUri(baseUrl, '/media/get', { download, id });
}

export function mediaHead(baseUrl: string, id: string): Promise<Response> {
  const url = makeUri(baseUrl, '/media/get', { id });
  return fetch(url, {
    method: 'HEAD',
    credentials: 'include',
  });
}

export function upload(
  baseUrl: string,
  file: Blob,
  filename: string,
  mimeType: string,
  path = '/media/upload',
): Promise<Result<Media, ApiError>> {
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
  baseUrl: string,
  file: File,
): Promise<Result<User, ApiError>> {
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
