import { ApiError, SpaceWithMember } from '@boluo/api';
import { SWRResponse } from 'swr';
import { useGetQuery } from './useGetQuery';

export const useQueryMySpaces = (): SWRResponse<SpaceWithMember[], ApiError> => {
  return useGetQuery('/spaces/my', null);
};
