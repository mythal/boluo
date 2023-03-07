import { ApiError, Patch, patch } from 'api';
import { appFetch } from 'api';
import { useCallback } from 'react';
import { Result } from 'utils';
import { useBaseUrl } from './useBaseUrl';

export const usePatch = () => {
  const baseUrl = useBaseUrl();
  return useCallback(async <P extends keyof Patch>(
    path: P,
    query: Patch[P]['query'],
    payload: Patch[P]['payload'],
  ): Promise<Result<Patch[P]['result'], ApiError>> => {
    return patch(baseUrl, path, query, payload);
  }, [baseUrl]);
};
