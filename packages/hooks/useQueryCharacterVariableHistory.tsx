import type { ApiError, CharacterVariableHistory } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRResponse } from 'swr';
import { unwrap } from '@boluo/utils/result';

export const useQueryCharacterVariableHistory = (
  characterId: string,
  variableKey: string,
): SWRResponse<CharacterVariableHistory[], ApiError> => {
  const cacheKey = ['/characters/variable_history', characterId, variableKey] as const;
  return useSWR<CharacterVariableHistory[], ApiError, typeof cacheKey>(
    cacheKey,
    ([path, characterId, key]) => get(path, { characterId, key }).then(unwrap),
  );
};
