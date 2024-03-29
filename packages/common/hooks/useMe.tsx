import { ApiError, GetMe } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR from 'swr';
import { unwrap } from '@boluo/utils';

const key = ['/users/get_me'] as const;
export const useMe = (): GetMe | 'LOADING' | null => {
  const { data, isLoading, error } = useSWR<GetMe | null, ApiError, typeof key>(key, ([path]) =>
    get(path, null).then(unwrap),
  );
  if (isLoading) {
    return 'LOADING';
  }
  if (error) {
    console.warn('Failed to fetch me: ', error);
    return null;
  }
  if (data == null) {
    return null;
  }
  return data;
};
