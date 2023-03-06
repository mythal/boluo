import { ApiError, Get, makeUri } from 'api';
import { appFetch } from 'api';
import { useCallback } from 'react';
import { Result } from 'utils';
import { useBaseUrl } from './useBaseUrl';

export const useGet = () => {
  const baseUrl = useBaseUrl();
  return useCallback(async <P extends keyof Get>(
    path: P,
    query: Get[P]['query'],
  ): Promise<Result<Get[P]['result'], ApiError>> => {
    const url = makeUri(baseUrl, path, query);

    const params: RequestInit = { credentials: 'include' };
    return appFetch(url, params);
  }, [baseUrl]);
};
