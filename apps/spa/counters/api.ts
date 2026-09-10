import type { CounterCommitResult } from './types';
import { get, post } from '@boluo/api-browser';
import { unwrap } from '@boluo/utils/result';
import type { ApplyEntryBatch } from '@boluo/api';
import { mergeCounterEntries } from './operations';

export const loadCounters = async (spaceId: string, scopeId: string) => {
  const [entries, counters] = await Promise.all([
    get('/entries/by_scope', { spaceId, scopeId }).then(unwrap),
    get('/entries/by_component', { spaceId, scopeId, componentType: 'core/counter' }).then(unwrap),
  ]);
  return mergeCounterEntries(entries, counters);
};

export const commitCounterBatch = async (batch: ApplyEntryBatch): Promise<CounterCommitResult> => {
  try {
    await post('/entries/batch', null, batch).then(unwrap);
    return 'Applied';
  } catch {
    return 'WriteFailed';
  }
};
