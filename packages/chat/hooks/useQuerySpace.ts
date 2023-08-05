import type { ApiError, Space } from 'api';
import { get } from 'api-browser';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { unwrap } from 'utils';

export const useQuerySpace = (
  spaceId: string,
  configuration?: SWRConfiguration<Space, ApiError>,
): SWRResponse<Space, ApiError> => {
  const key = ['/spaces/query', spaceId] as const;
  return useSWR<Space, ApiError, typeof key>(
    key,
    ([path, id]) => get(path, { id }).then(unwrap),
    configuration,
  );
};
