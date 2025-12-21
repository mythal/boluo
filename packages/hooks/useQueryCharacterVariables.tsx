import type { ApiError, CharacterVariable } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRResponse } from 'swr';
import { unwrap } from '@boluo/utils/result';

export const useQueryCharacterVariables = (
  characterId: string,
): SWRResponse<CharacterVariable[], ApiError> => {
  const key = ['/characters/variables', characterId] as const;
  return useSWR<CharacterVariable[], ApiError, typeof key>(key, ([path, id]) =>
    get(path, { id }).then(unwrap),
  );
};
