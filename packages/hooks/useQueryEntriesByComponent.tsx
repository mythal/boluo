import type { ApiError, EntryComponentMatch } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { unwrap } from '@boluo/utils/result';
import useSWR, { type SWRResponse } from 'swr';

export const useQueryEntriesByComponent = (
  spaceId: string | undefined,
  scopeId: string | undefined,
  componentType: string,
): SWRResponse<EntryComponentMatch[], ApiError> => {
  const key =
    spaceId && scopeId
      ? (['/entries/by_component', spaceId, scopeId, componentType] as const)
      : null;
  return useSWR<EntryComponentMatch[], ApiError, typeof key>(
    key,
    ([, currentSpaceId, currentScopeId, currentComponentType]) =>
      get('/entries/by_component', {
        spaceId: currentSpaceId,
        scopeId: currentScopeId,
        componentType: currentComponentType,
      }).then(unwrap),
  );
};
