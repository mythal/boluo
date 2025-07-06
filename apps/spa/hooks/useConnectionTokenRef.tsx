import { type ApiError } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { sleep } from '@boluo/utils';
import { useRef, type RefObject } from 'react';
import useSWR from 'swr';

export const useConnectionTokenRef = (): RefObject<string | null> => {
  const key = ['/events/token'] as const;
  const ref = useRef<string | null>(null);
  const { data } = useSWR<{ token: string | null }, ApiError, typeof key>(
    key,
    async ([path]) => {
      let result = await get(path, null);
      if (result.isErr) {
        await sleep(100);
        result = await get(path, null);
      }
      if (result.isErr) {
        alert('Failed to establish connection, please refresh the page');
      }
      return result.unwrap();
    },
    {
      refreshInterval: 60 * 1000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      revalidateOnMount: true,
    },
  );
  ref.current = data?.token || null;
  return ref;
};
