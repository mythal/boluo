import { type ApiError, type SpaceWithMember } from '@boluo/api';
import { type SWRResponse } from 'swr';
import { useGetQuery } from './useGetQuery';

export const useQueryMySpaces = (): SWRResponse<SpaceWithMember[], ApiError> => {
  return useGetQuery('/spaces/my', null);
};
