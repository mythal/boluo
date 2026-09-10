import type { ScopedMutator } from 'swr';
import {
  entryQueryKeys,
  matchesEntryComponentQueries,
  matchesEntryQueries,
} from '@boluo/hooks/entryQueryKeys';

export const refreshEntries = async (
  mutate: ScopedMutator,
  spaceId: string,
  scopeId: string,
  entryId?: string,
): Promise<void> => {
  await Promise.all([
    mutate(entryQueryKeys.byScope(spaceId, scopeId)),
    mutate(matchesEntryComponentQueries(spaceId, scopeId)),
    mutate(matchesEntryQueries(spaceId, scopeId, entryId)),
  ]);
};
