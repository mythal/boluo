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

export const LOADING = 'LOADING';
export type LOADING = typeof LOADING;

export interface AppError {
  code: ErrorCode;
  message: string;
  table: string | null;
}

export const loading: AppError = {
  code: LOADING,
  message: '载入中',
  table: null,
};

export const notJson: AppError = {
  code: NOT_JSON,
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
      return '您没有登陆，无法进行此项操作';
    case NO_PERMISSION:
      return '您没有执行这项操作或查询的权限';
    case VALIDATION_FAIL:
      return `您的输入有误：${e.message}`;
    case FETCH_FAIL:
      return `遇到网络错误，这可能是我们的服务器出错或者您的网络故障`;
    case NOT_JSON:
      return '糟糕！服务器返回的消息格式有误，这可能是我们的服务器出错或者您的网络故障';
    case UNEXPECTED:
      return '糟糕！出现了服务器内部错误，请联系我们';
    case BAD_REQUEST:
      return `您发送的 API 请求格式有误: ${e.message}`;
    default:
      console.warn(e);
      return `网页发生了一个本该处理但未处理的错误: ${e.message}`;
  }
};
