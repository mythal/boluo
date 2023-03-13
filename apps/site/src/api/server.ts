import 'server-only';
import type { ApiError, Get, Post } from 'api';
import { makeUri } from 'api';
import { appFetch } from 'api';
import { cookies } from 'next/headers';
import type { Result } from 'utils';
import { SERVER_SIDE_API_URL } from '../const';

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
  const url = makeUri(SERVER_SIDE_API_URL, path, query);
  const headers = makeHeaders();
  return appFetch(url, {
    headers,

    // By next.js document:
    // https://beta.nextjs.org/docs/api-reference/fetch#optionscache
    // > If you don't provide a cache option, Next.js will default to force-cache,
    // > unless a dynamic function such as cookies() is used, in which case it
    // > will default to no-store.
    //
    // In the `makeHeader()` above, `cookies()` are called, however, in recent
    // versions this has become cached by default, which may be a bug in Next.js.
    cache: 'no-cache',
  });
}

export async function post<P extends keyof Post>(
  path: P,
  payload: Post[P]['payload'],
): Promise<Result<Post[P]['result'], ApiError>> {
  const url = SERVER_SIDE_API_URL + path;

  const headers = makeHeaders();
  headers.set('Content-Type', 'application/json');
  return appFetch(url, {
    headers,
    cache: 'no-cache',
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
