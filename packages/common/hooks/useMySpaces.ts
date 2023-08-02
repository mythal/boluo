import { ApiError, SpaceWithMember } from 'api';
import { get } from 'api-browser';
import useSWR, { SWRResponse } from 'swr';
import { unwrap } from 'utils';

const key = ['/spaces/my'] as const;

export const useMySpaces = (): SWRResponse<SpaceWithMember[], ApiError> => {
  return useSWR<SpaceWithMember[], ApiError, typeof key>(['/spaces/my'], ([path]) => get(path, null).then(unwrap));
};
