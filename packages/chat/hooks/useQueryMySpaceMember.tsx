import type { ApiError, SpaceMember } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { SWRResponse } from 'swr';
import { unwrap } from '@boluo/utils';

export const useMySpaceMember = (spaceId: string | null): SWRResponse<SpaceMember | null, ApiError> => {
  return useSWR(spaceId ? (['/spaces/my_space_member', spaceId] as const) : null, ([path, id]) =>
    get(path, { id }).then(unwrap),
  );
};
