import { get } from '@boluo/api-browser';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export const useLogout = () => {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  return useCallback(async () => {
    await get('/users/logout', null);
    await mutate(['/users/query', null], null);
    router.refresh();
  }, [mutate, router]);
};
