import { AppError } from './error';
import { ApiResultObject } from './request';

const CSRF_KEY = 'csrf-token';

const isTimeout = (token: string): boolean => {
  const matched = token.match(/\.(\d+)\./);
  if (!matched) {
    return true;
  }
  const expire = parseInt(matched[1], 10);
  const now = new Date().getTime() / 1000;
  return expire < now;
};

const refreshCsrfToken = async (): Promise<string> => {
  const fetched = await fetch('/api/csrf-token', { credentials: 'include' });
  const csrfResult: ApiResultObject<string, AppError> = await fetched.json();
  if (csrfResult.isOk) {
    localStorage.setItem(CSRF_KEY, csrfResult.ok);
    return csrfResult.ok;
  } else {
    throw new Error(csrfResult.err.message);
  }
};

export const getCsrfToken = async (): Promise<string> => {
  const csrfToken: string | null = localStorage.getItem(CSRF_KEY);
  if (csrfToken == null || isTimeout(csrfToken)) {
    return refreshCsrfToken();
  }
  return csrfToken;
};

export const clearCsrfToken = () => localStorage.removeItem(CSRF_KEY);
