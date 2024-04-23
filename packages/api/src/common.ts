import type { Result } from '@boluo/utils';
import { Err, Ok } from '@boluo/utils';
import { FetchFailError, NotJsonError, UnexpectedError } from './error-types';
import { ApiError } from './errors';
import { isAppResponse } from './request';

export async function appFetch<T>(url: string, params: RequestInit): Promise<Result<T, ApiError>> {
  let result: Result<T, ApiError>;
  if (process.env.NODE_ENV === 'development') {
    if (!params.headers) {
      params.headers = new Headers({ 'X-Debug': 'true' });
    } else {
      const headers = new Headers(params.headers);
      headers.set('X-Debug', 'true');
      params.headers = headers;
    }
  }
  try {
    const response = await fetch(url, params);
    let data: unknown;
    try {
      data = await response.json();
    } catch (cause) {
      const error: NotJsonError = { code: 'NOT_JSON', cause };
      result = new Err(error);
    }
    if (isAppResponse(data)) {
      if (data.isOk) {
        result = new Ok(data.ok as T);
      } else {
        result = new Err(data.err);
      }
    } else {
      const error: UnexpectedError = { code: 'UNEXPECTED', message: 'Got incorrect data from the server' };
      result = new Err(error);
    }
  } catch (cause) {
    const error: FetchFailError = { code: 'FETCH_FAIL', cause };
    result = new Err(error);
  }
  return result;
}
