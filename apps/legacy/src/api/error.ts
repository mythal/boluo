import { Err } from '../utils/result';
import { type AppResult } from './request';

export type ErrorCode =
  | UNAUTHENTICATED
  | NO_PERMISSION
  | NOT_JSON
  | NOT_FOUND
  | UNEXPECTED
  | BAD_REQUEST
  | VALIDATION_FAIL
  | CONFLICT
  | FETCH_FAIL
  | LOADING
  | METHOD_NOT_ALLOWED
  | LIMIT_EXCEEDED;

export const UNAUTHENTICATED = 'UNAUTHENTICATED';
export type UNAUTHENTICATED = typeof UNAUTHENTICATED;

export const NO_PERMISSION = 'NO_PERMISSION';
export type NO_PERMISSION = typeof NO_PERMISSION;

export const NOT_JSON = 'NOT_JSON';
export type NOT_JSON = typeof NOT_JSON;

export const NOT_FOUND = 'NOT_FOUND';
export type NOT_FOUND = typeof NOT_FOUND;

export const FETCH_FAIL = 'FETCH_FAIL';
export type FETCH_FAIL = typeof FETCH_FAIL;

export const UNEXPECTED = 'UNEXPECTED';
export type UNEXPECTED = typeof UNEXPECTED;

export const BAD_REQUEST = 'BAD_REQUEST';
export type BAD_REQUEST = typeof BAD_REQUEST;

export const VALIDATION_FAIL = 'VALIDATION_FAIL';
export type VALIDATION_FAIL = typeof VALIDATION_FAIL;

export const CONFLICT = 'CONFLICT';
export type CONFLICT = typeof CONFLICT;

export const METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED';
export type METHOD_NOT_ALLOWED = typeof METHOD_NOT_ALLOWED;

export const LOADING = 'LOADING';
export type LOADING = typeof LOADING;

export const LIMIT_EXCEEDED = 'LIMIT_EXCEEDED';
export type LIMIT_EXCEEDED = typeof LIMIT_EXCEEDED;

export interface AppError {
  code: ErrorCode;
  message: string;
  context: string | null;
}

export const loading: AppError = {
  code: LOADING,
  message: '载入中',
  context: null,
};

export const errLoading = <T>(): AppResult<T> => {
  return new Err(loading);
};

export const notFound = <T>(message = ''): AppResult<T> => {
  return new Err({ code: NOT_FOUND, message }) as AppResult<T>;
};

export const notJson: AppError = {
  code: NOT_JSON,
  message: 'The response body is not JSON',
  context: null,
};

export const fetchFailed: AppError = {
  code: FETCH_FAIL,
  message: 'HTTP request failed',
  context: null,
};

export interface ErrorText {
  description: string;
  detail?: string;
  raw: AppError;
}

export const errorText = (raw: AppError): ErrorText => {
  switch (raw.code) {
    case UNAUTHENTICATED:
      return { description: '您没有登陆，无法进行此项操作', raw };
    case NO_PERMISSION:
      return { description: '您没有执行这项操作或查询的权限', raw };
    case VALIDATION_FAIL:
      return { description: `您的输入有误`, detail: raw.message, raw };
    case FETCH_FAIL:
      return { description: '遇到网络错误', detail: '这可能是我们的服务器出错或者的网络故障', raw };
    case NOT_JSON:
      return {
        description: '糟糕！服务器返回的消息格式有误',
        detail: '这可能是我们的服务器出错或者您的网络故障',
        raw,
      };
    case UNEXPECTED:
      return {
        description: '糟糕！出现了服务器内部错误',
        detail: '这代表服务器出现了未曾预料的错误，如果反复出现可以联系我们',
        raw,
      };
    case BAD_REQUEST:
      return { description: '请求格式错误', detail: raw.message, raw };
    default:
      console.warn(raw);
      return { description: '发生了一个未处理的错误', detail: raw.message, raw };
  }
};
