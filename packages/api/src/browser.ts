import type { Result } from 'utils';
import { ApiError, Get, makeUri, Patch, Post } from '.';
import { appFetch } from './common';

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
