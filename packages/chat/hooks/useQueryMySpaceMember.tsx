import type { ApiError, SpaceMember } from 'api';
import { get } from 'api-browser';
import useSWR, { SWRResponse } from 'swr';
import { unwrap } from 'utils';

export const useMySpaceMember = (spaceId: string): SWRResponse<SpaceMember | null, ApiError> => {
  const key = ['/spaces/my_space_member', spaceId] as const;
  return useSWR(
    key,
    ([path, id]) => get(path, { id }).then(unwrap),
  );
};
