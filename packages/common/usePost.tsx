import { ApiError, makeUri, Post } from 'api';
import { appFetch } from 'api';
import { useCallback } from 'react';
import { Result } from 'utils';
import { useBaseUrl } from './useBaseUrl';

const headers = new Headers({
  'Content-Type': 'application/json',
});

export const usePost = () => {
  const baseUrl = useBaseUrl();
  return useCallback(async <P extends keyof Post>(
    path: P,
    query: Post[P]['query'],
    payload: Post[P]['payload'],
  ): Promise<Result<Post[P]['result'], ApiError>> => {
    const url = makeUri(baseUrl, path, query);
    const params: RequestInit = {
      credentials: 'include',
      headers,
      cache: 'no-cache',
      method: 'POST',
      body: JSON.stringify(payload),
    };
    return appFetch(url, params);
  }, [baseUrl]);
};
