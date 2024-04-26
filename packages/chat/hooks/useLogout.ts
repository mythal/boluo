import { get } from '@boluo/api-browser';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export function useLogout(): () => void {
  const { mutate } = useSWRConfig();
  return useCallback(async () => {
    await get('/users/logout', null);
    localStorage.clear();
    sessionStorage.clear();
    await mutate(['/users/query', null], null);
    await mutate(
      (key) => {
        if (!Array.isArray(key)) return false;
        return key[0] === '/channels/by_space';
      },
      undefined,
      { revalidate: true },
    );
  }, [mutate]);
}
