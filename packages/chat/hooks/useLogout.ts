import { get } from 'api-browser';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export function useLogout(): () => void {
  const { mutate } = useSWRConfig();
  return useCallback(async () => {
    await get('/users/logout', null);
    localStorage.clear();
    sessionStorage.clear();
    await mutate(['/users/get_me'], null);
  }, [mutate]);
}
