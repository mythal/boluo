import type { ApiError, Character } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { unwrap } from '@boluo/utils/result';
import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';

export interface UseQueryCharactersProps {
  spaceId: string | undefined;
  includeArchived?: boolean;
  portrayableOnly?: boolean;
  config?: SWRConfiguration<Character[], ApiError>;
}

export const useQueryCharacters = ({
  spaceId,
  includeArchived = false,
  portrayableOnly = false,
  config,
}: UseQueryCharactersProps): SWRResponse<Character[], ApiError> => {
  const key = spaceId
    ? (['/characters/by_space', spaceId, includeArchived, portrayableOnly] as const)
    : null;
  return useSWR<Character[], ApiError, typeof key>(
    key,
    ([, id, archived, portrayable]) =>
      get('/characters/by_space', {
        spaceId: id,
        includeArchived: archived,
        portrayableOnly: portrayable,
      }).then(unwrap),
    config,
  );
};
