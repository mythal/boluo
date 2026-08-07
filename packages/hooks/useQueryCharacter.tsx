import type { ApiError, Character } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { unwrap } from '@boluo/utils/result';
import useSWR, { type SWRResponse } from 'swr';

export const useQueryCharacter = (
  spaceId: string | undefined,
  characterId: string | undefined,
): SWRResponse<Character, ApiError> => {
  const key =
    spaceId && characterId ? (['/characters/query', spaceId, characterId] as const) : null;
  return useSWR<Character, ApiError, typeof key>(key, ([, currentSpaceId, currentCharacterId]) =>
    get('/characters/query', { spaceId: currentSpaceId, characterId: currentCharacterId }).then(
      unwrap,
    ),
  );
};
