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
  | METHOD_NOT_ALLOWED;

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

export interface AppError {
  code: ErrorCode;
  message: string;
  table: string | null;
}

export const notJson: AppError = {
  code: 'NOT_JSON',
  message: 'The response body is not JSON',
  table: null,
};

export const fetchFailed: AppError = {
  code: FETCH_FAIL,
  message: 'HTTP request failed',
  table: null,
};

export const errorText = (e: AppError): string => {
  switch (e.code) {
    case UNAUTHENTICATED:
      return '认证失败，需要登录';
    case NO_PERMISSION:
      return '您没有访问权限';
    case VALIDATION_FAIL:
      return `您的输入有误：${e.message}`;
    case FETCH_FAIL:
      return `遭遇到未知的网络错误`;
    case NOT_JSON:
      return '搞砸了! 服务器返回的消息格式有误，可能是服务器或者您的网络故障';
    case UNEXPECTED:
      return 'Oops! 服务器内部错误';
    case BAD_REQUEST:
      return `出错了! 请求格式有误: ${e.message}`;
    default:
      console.warn(e);
      return `发生了一个本该处理但未处理的错误: ${e.message}`;
  }
};
