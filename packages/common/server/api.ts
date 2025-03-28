import 'server-only';
import type { ApiError, Get, Post } from '@boluo/api';
import { makeUri } from '@boluo/api';
import { appFetch } from '@boluo/api';
import type { Result } from '@boluo/utils';

let backEndUrl: string | undefined;

const getBackEndUrl = () => {
  if (backEndUrl) {
    return backEndUrl;
  } else if (process.env.BACKEND_URL) {
    const BACKEND_URL = process.env.BACKEND_URL;
    if (BACKEND_URL.endsWith('/api/')) {
      backEndUrl = BACKEND_URL.slice(0, -1);
    } else if (BACKEND_URL.endsWith('/')) {
      backEndUrl = BACKEND_URL + 'api';
    } else if (BACKEND_URL.endsWith('/api')) {
      backEndUrl = BACKEND_URL;
    } else {
      backEndUrl = BACKEND_URL + '/api';
    }
    return backEndUrl;
  } else {
    throw new Error('BACKEND_URL is not set');
  }
};

export async function get<P extends keyof Get>(
  path: P,
  query: Get[P]['query'],
): Promise<Result<Get[P]['result'], ApiError>> {
  const url = makeUri(getBackEndUrl(), path, query);
  return appFetch(url, {});
}

export async function post<P extends keyof Post>(
  path: P,
  payload: Post[P]['payload'],
): Promise<Result<Post[P]['result'], ApiError>> {
  const url = getBackEndUrl() + path;

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  return appFetch(url, {
    headers,
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
