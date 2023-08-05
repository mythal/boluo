import { ApiError, SpaceWithMember } from 'api';
import { SWRResponse } from 'swr';
import { useGetQuery } from './useGetQuery';

export const useMySpaces = (): SWRResponse<SpaceWithMember[], ApiError> => {
  return useGetQuery('/spaces/my', null);
};
