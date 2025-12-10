import type { Result } from '@boluo/utils/result';
import { Err, Ok } from '@boluo/utils/result';
import { type FetchFailError, type NotJsonError, type UnexpectedError } from './error-types';
import { type ApiError } from './errors';
import { isAppResponse } from './request';

export async function appFetch<T>(url: string, params: RequestInit): Promise<Result<T, ApiError>> {
  let response: Response;
  try {
    response = await fetch(url, params);
  } catch (cause) {
    const error: FetchFailError = { code: 'FETCH_FAIL', cause };
    return new Err(error);
  }
  if (response.headers.get('content-type') !== 'application/json') {
    const error: NotJsonError = {
      code: 'NOT_JSON',
      cause: new Error('Response is not JSON'),
      body: await response.text(),
    };
    return new Err(error);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (cause) {
    const error: NotJsonError = { code: 'NOT_JSON', cause };
    return new Err(error);
  }
  if (isAppResponse(data)) {
    if (data.isOk) {
      return new Ok(data.ok as T);
    } else {
      return new Err(data.err);
    }
  } else {
    const error: UnexpectedError = {
      code: 'UNEXPECTED',
      message: 'Got incorrect data from the server',
      context: data || 'Empty data',
    };
    return new Err(error);
  }
}
