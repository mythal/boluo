import 'server-only';
import type { ApiError, Get, Post, Put } from '@boluo/api';
import { makeUri } from '@boluo/api';
import { appFetch } from '@boluo/api';
import type { StringKeyOf } from '@boluo/types';
import { type Result } from '@boluo/utils/result';

let cachedBackEndUrl: string | undefined;

const getBackEndUrl = () => {
  if (cachedBackEndUrl) {
    return cachedBackEndUrl;
  }

  // Cloudflare Workers exposes runtime bindings through process.env while handling a request.
  // Reading the value at module initialization can capture undefined before OpenNext installs
  // the request context.
  // eslint-disable-next-line no-restricted-globals
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
    if (backendUrl.endsWith('/api/')) {
      cachedBackEndUrl = backendUrl.slice(0, -1);
    } else if (backendUrl.endsWith('/')) {
      cachedBackEndUrl = backendUrl + 'api';
    } else if (backendUrl.endsWith('/api')) {
      cachedBackEndUrl = backendUrl;
    } else {
      cachedBackEndUrl = backendUrl + '/api';
    }
    return cachedBackEndUrl;
  }

  throw new Error('BACKEND_URL is not set');
};

export async function get<P extends StringKeyOf<Get>>(
  path: P,
  query: Get[P]['query'],
): Promise<Result<Get[P]['result'], ApiError>> {
  const url = makeUri(getBackEndUrl(), path, query);
  return appFetch(url, {});
}

export async function post<P extends StringKeyOf<Post>>(
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

export async function put<P extends StringKeyOf<Put>>(
  path: P,
  payload: Put[P]['payload'],
): Promise<Result<Put[P]['result'], ApiError>> {
  const url = getBackEndUrl() + path;

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  return appFetch(url, {
    headers,
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
