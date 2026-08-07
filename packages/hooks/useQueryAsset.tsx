import type { ApiError, Asset } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { unwrap } from '@boluo/utils/result';
import useSWR, { type SWRResponse } from 'swr';

export const useQueryAsset = (
  spaceId: string | undefined,
  assetId: string | undefined,
): SWRResponse<Asset, ApiError> => {
  const key = spaceId && assetId ? (['/assets/query', spaceId, assetId] as const) : null;
  return useSWR<Asset, ApiError, typeof key>(key, ([, currentSpaceId, currentAssetId]) =>
    get('/assets/query', { spaceId: currentSpaceId, assetId: currentAssetId }).then(unwrap),
  );
};
