import type { ApiError, FetchFailError, NotJsonError, UnexpectedError } from 'api';
import { isAppResponse } from 'api';
import type { Result } from 'utils';
import { Ok } from 'utils';
import { Err } from 'utils';

export async function appFetch<T>(url: string, params: RequestInit): Promise<Result<T, ApiError>> {
  let result: Result<T, ApiError>;
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
