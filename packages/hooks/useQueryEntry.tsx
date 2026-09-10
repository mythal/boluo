import { entryQueryKeys } from './entryQueryKeys';
import type { ApiError, Entry } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { unwrap } from '@boluo/utils/result';
import useSWR, { type SWRResponse } from 'swr';

export const useQueryEntry = (
  spaceId: string | undefined,
  scopeId: string | undefined,
  entryId: string | undefined,
): SWRResponse<Entry, ApiError> => {
  const key =
    spaceId && scopeId && entryId ? entryQueryKeys.entry(spaceId, scopeId, entryId) : null;
  return useSWR<Entry, ApiError, typeof key>(
    key,
    ([, currentSpaceId, currentScopeId, currentEntryId]) =>
      get('/entries/query', {
        spaceId: currentSpaceId,
        scopeId: currentScopeId,
        entryId: currentEntryId,
      }).then(unwrap),
  );
};
