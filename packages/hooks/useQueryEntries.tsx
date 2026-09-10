import { entryQueryKeys } from './entryQueryKeys';
import type { ApiError, EntryMetadata } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { unwrap } from '@boluo/utils/result';
import useSWR, { type SWRResponse } from 'swr';

export const useQueryEntries = (
  spaceId: string | undefined,
  scopeId: string | undefined,
): SWRResponse<EntryMetadata[], ApiError> => {
  const key = spaceId && scopeId ? entryQueryKeys.byScope(spaceId, scopeId) : null;
  return useSWR<EntryMetadata[], ApiError, typeof key>(key, ([, currentSpaceId, currentScopeId]) =>
    get('/entries/by_scope', { spaceId: currentSpaceId, scopeId: currentScopeId }).then(unwrap),
  );
};
