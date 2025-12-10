import type { ApiError } from './errors';

export const makeUri = (baseUrl: string, path: string, query?: unknown): string => {
  path = baseUrl + path;
  if (query === undefined || query == null || typeof query !== 'object') {
    return path;
  }
  const entities = Object.entries(query as Record<string, unknown>);
  if (entities.length === 0) {
    return path;
  }
  const searchParams = new URLSearchParams();
  for (const entry of entities) {
    const [key, value] = entry;
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
      searchParams.set(key, String(value));
    }
  }
  return `${path}?${searchParams.toString()}`;
};

export interface AppResponse {
  isOk: boolean;
  ok: unknown;
  err: ApiError;
}
export function isAppResponse(data: unknown): data is AppResponse {
  if (typeof data !== 'object' || data === undefined || data == null) {
    return false;
  }
  return 'isOk' in data;
}
