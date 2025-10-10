import { ApiError } from '@boluo/api';
import { Get } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { unwrap } from '@boluo/utils/result';

export const useGetQuery = <P extends keyof Get>(
  path: P,
  query: Get[P]['query'],
  options?: SWRConfiguration<Get[P]['result']>,
): SWRResponse<Get[P]['result'], ApiError> =>
  useSWR<Get[P]['result'], ApiError, [P, Get[P]['query']]>(
    [path, query],
    ([path]) => {
      return get(path, null).then(unwrap);
    },
    options,
  );
