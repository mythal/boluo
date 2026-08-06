import type { ApiError, CharacterUsage } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { unwrap } from '@boluo/utils/result';
import useSWR, { type SWRResponse } from 'swr';

export const useQueryCharacterUsages = (
  spaceId: string | undefined,
  characterId: string | undefined,
): SWRResponse<CharacterUsage[], ApiError> => {
  const key =
    spaceId && characterId ? (['/characters/usages', spaceId, characterId] as const) : null;
  return useSWR<CharacterUsage[], ApiError, typeof key>(
    key,
    ([, currentSpaceId, currentCharacterId]) =>
      get('/characters/usages', {
        spaceId: currentSpaceId,
        characterId: currentCharacterId,
      }).then(unwrap),
  );
};
