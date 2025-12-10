import { get } from '@boluo/api-browser';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export function useLogout(): () => void {
  const { mutate } = useSWRConfig();
  return useCallback(() => {
    void (async function () {
      await get('/users/logout', null);
      localStorage.clear();
      sessionStorage.clear();
      await mutate(() => true, undefined, { revalidate: true });
    })();
  }, [mutate]);
}
