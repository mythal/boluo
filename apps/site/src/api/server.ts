import 'server-only';
import type { ApiError, Get, Post } from 'boluo-api';
import { makeUri } from 'boluo-api';
import type { Result } from 'boluo-utils';
import { cookies } from 'next/headers';
import { BACKEND_URL } from '../const';
import { appFetch } from './common';

// Keep this value the same as the server
const sessionCookieKey = 'boluo-session-v1';

const makeHeaders = (): Headers => {
  const session = cookies().get(sessionCookieKey)?.value;

  const headers = new Headers();
  if (session) {
    headers.set('authorization', session);
  }
  return headers;
};

export async function get<P extends keyof Get>(
  path: P,
  query: Get[P]['query'],
): Promise<Result<Get[P]['result'], ApiError>> {
  const url = makeUri(BACKEND_URL, path, query);
  return appFetch(url, { headers: makeHeaders() });
}

export async function post<P extends keyof Post>(
  path: P,
  payload: Post[P]['result'],
): Promise<Result<Post[P]['result'], ApiError>> {
  const url = BACKEND_URL + path;

  const headers = makeHeaders();
  headers.set('Content-Type', 'application/json');
  return appFetch(url, {
    headers,
    cache: 'no-cache',
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
