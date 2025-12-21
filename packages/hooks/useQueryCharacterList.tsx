import type { ApiError, Character } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRResponse, useSWRConfig } from 'swr';
import { unwrap } from '@boluo/utils/result';

export const useQueryCharacterList = (
  spaceId: string,
  includeArchived = false,
): SWRResponse<Character[], ApiError> => {
  const { mutate } = useSWRConfig();
  const key = ['/characters/by_space', spaceId, includeArchived] as const;
  return useSWR<Character[], ApiError, typeof key>(
    key,
    ([path, id, includeArchived]) => get(path, { id, includeArchived }).then(unwrap),
    {
      onSuccess: (characters) =>
        void Promise.all(
          characters.map((character) =>
            mutate(['/characters/query', character.id], character, { revalidate: false }),
          ),
        ),
    },
  );
};
