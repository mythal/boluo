import { ApiError, Post, post } from 'api';
import { useCallback } from 'react';
import { Result } from 'utils';
import { useBaseUrl } from './useBaseUrl';

export const usePost = () => {
  const baseUrl = useBaseUrl();
  return useCallback(async <P extends keyof Post>(
    path: P,
    query: Post[P]['query'],
    payload: Post[P]['payload'],
  ): Promise<Result<Post[P]['result'], ApiError>> => {
    return post(baseUrl, path, query, payload);
  }, [baseUrl]);
};
