import type { ApiError, Space } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';

export const useQuerySpace = (
  spaceId: string | null | undefined,
  configuration?: SWRConfiguration<Space, ApiError>,
): SWRResponse<Space, ApiError> => {
  return useSWR<Space, ApiError, ['/spaces/query', string] | null>(
    spaceId == null || spaceId === '' ? null : ['/spaces/query', spaceId],
    async ([path, id]) => {
      const result = await get(path, { id });
      return result.unwrap();
    },
    configuration,
  );
};
