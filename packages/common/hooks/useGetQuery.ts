import { ApiError } from 'api';
import { Get } from 'api';
import { get } from 'api-browser';
import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { unwrap } from 'utils';

export const useGetQuery = <P extends keyof Get>(
  path: P,
  query: Get[P]['query'],
  options?: SWRConfiguration<Get[P]['result']>,
): SWRResponse<Get[P]['result'], ApiError> =>
  useSWR<Get[P]['result'], ApiError, [P, Get[P]['query']]>([path, query], ([path]) => {
    return get(path, null).then(unwrap);
  }, options);
