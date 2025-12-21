import type { ApiError, Character } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRResponse } from 'swr';
import { unwrap } from '@boluo/utils/result';

export const useQueryCharacter = (characterId: string): SWRResponse<Character, ApiError> => {
  const key = ['/characters/query', characterId] as const;
  return useSWR<Character, ApiError, typeof key>(key, ([path, id]) =>
    get(path, { id }).then(unwrap),
  );
};
