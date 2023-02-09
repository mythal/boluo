export interface UnauthenticatedError {
  code: 'UNAUTHENTICATED';
  message: string;
}

export interface NoPermissionError {
  code: 'NO_PERMISSION';
  message: string;
}

export interface NotJsonError {
  code: 'NOT_JSON';
  cause: unknown;
}

export interface NotFoundError {
  code: 'NOT_FOUND';
  message: string;
}

export interface FetchFailError {
  code: 'FETCH_FAIL';
  cause: unknown;
}

export interface UnexpectedError {
  code: 'UNEXPECTED';
  message: string;
}

export interface BadRequestError {
  code: 'BAD_REQUEST';
  message: string;
}

export interface ValidationFailError {
  code: 'VALIDATION_FAIL';
  message: string;
}

export interface ConflictError {
  code: 'CONFLICT';
  message: string;
}

export interface MethodNotAllowedError {
  code: 'METHOD_NOT_ALLOWED';
  message: string;
}

export interface LimitExceededError {
  code: 'LIMIT_EXCEEDED';
  message: string;
}
