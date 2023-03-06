import { ApiError, makeUri, Patch } from 'api';
import { appFetch } from 'api';
import { useCallback } from 'react';
import { Result } from 'utils';
import { useBaseUrl } from './useBaseUrl';

const headers = new Headers({
  'Content-Type': 'application/json',
});

export const usePatch = () => {
  const baseUrl = useBaseUrl();
  return useCallback(async <P extends keyof Patch>(
    path: P,
    query: Patch[P]['query'],
    payload: Patch[P]['payload'],
  ): Promise<Result<Patch[P]['result'], ApiError>> => {
    const url = makeUri(baseUrl, path, query);
    const params: RequestInit = {
      credentials: 'include',
      headers,
      cache: 'no-cache',
      method: 'PATCH',
      body: JSON.stringify(payload),
    };
    return appFetch(url, params);
  }, [baseUrl]);
};
