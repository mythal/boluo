import type { Arguments, ScopedMutator } from 'swr';

const PROFILE_QUERY_PATHS = new Set(['/users/query', '/users/settings', '/spaces/my']);

export const isProfileQueryKey = (key?: Arguments): boolean =>
  Array.isArray(key) && typeof key[0] === 'string' && PROFILE_QUERY_PATHS.has(key[0]);

export const clearProfileQueryCache = (mutate: ScopedMutator): Promise<unknown[]> =>
  mutate(isProfileQueryKey, undefined, { revalidate: false });
