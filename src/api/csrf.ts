import { AppError } from './error';
import { ApiResultObject } from './request';

const CSRF_KEY = 'csrf-token';

const isInvalid = (token: string): boolean => {
  const matched = token.match(/(.+)\.(\d+)\./);
  if (!matched) {
    return true;
  }
  // const encodedSessionId = matched[1];
  // const id = uuidStringify(Uint8Array.from(atob(encodedSessionId), c => c.charCodeAt(0)));
  // const userId = store.getState().profile?.user.id || '00000000-0000-0000-0000-000000000000';
  const expire = parseInt(matched[2], 10);
  const now = new Date().getTime() / 1000;
  return expire < now;
};

export const refreshCsrfToken = async (): Promise<string> => {
  const fetched = await fetch('/api/csrf-token', { credentials: 'include' });
  const csrfResult: ApiResultObject<string, AppError> = await fetched.json();
  if (csrfResult.isOk) {
    localStorage.setItem(CSRF_KEY, csrfResult.ok);
    return csrfResult.ok;
  } else {
    throw new Error(csrfResult.err.message);
  }
};

let initial = true;

export const getCsrfToken = async (): Promise<string> => {
  const csrfToken: string | null = localStorage.getItem(CSRF_KEY);
  if (csrfToken === null || initial || isInvalid(csrfToken)) {
    initial = false;
    return refreshCsrfToken();
  }
  return csrfToken;
};

export const clearCsrfToken = () => localStorage.removeItem(CSRF_KEY);
