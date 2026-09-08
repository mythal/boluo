import type { ComponentChangePreview, EntryComponentHistory } from '@boluo/api';

export const componentChangesFromHistory = (
  changes: EntryComponentHistory[],
): ComponentChangePreview[] =>
  changes.map((change) => ({
    component: {
      scopeId: change.scopeId,
      entryId: change.entryId,
      key: change.key,
      componentType: change.componentType,
    },
    displayName: '',
    before: change.beforePayload,
    after: change.action === 'REMOVE' ? null : change.payload,
  }));
