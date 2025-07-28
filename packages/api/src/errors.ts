import type * as errors from './error-types';

export type ApiError =
  | errors.UnauthenticatedError
  | errors.NoPermissionError
  | errors.NotJsonError
  | errors.NotFoundError
  | errors.FetchFailError
  | errors.UnexpectedError
  | errors.BadRequestError
  | errors.ValidationFailError
  | errors.ConflictError
  | errors.MethodNotAllowedError
  | errors.LimitExceededError;

// https://stackoverflow.com/a/50125960/1137004
type DiscriminateUnion<T, K extends keyof T, V extends T[K]> = T extends Record<K, V> ? T : never;
type MapDiscriminatedUnion<T extends Record<K, string>, K extends keyof T> = {
  [V in T[K]]: DiscriminateUnion<T, K, V>;
};
export type ApiErrorMap = MapDiscriminatedUnion<ApiError, 'code'>;

export type ApiErrorCode = ApiError['code'];

const hasOwnProperty = (obj: unknown, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

export const isApiError = (error: unknown): error is ApiError =>
  typeof error === 'object' &&
  error != null &&
  hasOwnProperty(error, 'code') &&
  (hasOwnProperty(error, 'message') || hasOwnProperty(error, 'cause'));

export const errorCode = (error: unknown) => {
  if (isApiError(error)) {
    return error.code;
  } else if (error instanceof Error) {
    return error.name;
  } else {
    return 'UNKNOWN';
  }
};

export const keepError =
  <Code extends ApiErrorCode>(watchCodeList: Code[]) =>
  (error: unknown): ApiErrorMap[Code] => {
    if (!isApiError(error)) {
      throw error;
    }
    for (const code of watchCodeList) {
      if (code === error.code) {
        return error as ApiErrorMap[Code];
      }
    }
    throw error;
  };
