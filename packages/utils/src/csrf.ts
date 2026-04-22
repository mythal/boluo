export const CSRF_COOKIE_KEY = 'boluo-csrf-token';
export const CSRF_HEADER_KEY = 'X-CSRF-Token';

export function readCookie(name: string, cookieSource?: string): string | null {
  const source = cookieSource ?? (typeof document === 'undefined' ? '' : document.cookie);
  if (source === '') {
    return null;
  }

  for (const item of source.split(';')) {
    const cookie = item.trim();
    const splitIndex = cookie.indexOf('=');
    if (splitIndex <= 0) {
      continue;
    }
    const cookieName = cookie.slice(0, splitIndex);
    if (cookieName !== name) {
      continue;
    }
    const value = cookie.slice(splitIndex + 1);
    return value === '' ? null : value;
  }
  return null;
}

export function isUnsafeHttpMethod(method: string | undefined): boolean {
  const current = (method ?? 'GET').toUpperCase();
  return !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(current);
}

export function applyCsrfHeader(
  headers: Headers,
  method: string | undefined,
  hasAuthorizationToken: boolean,
): void {
  if (hasAuthorizationToken || !isUnsafeHttpMethod(method)) {
    return;
  }
  const token = readCookie(CSRF_COOKIE_KEY);
  if (token) {
    headers.set(CSRF_HEADER_KEY, token);
  }
}
