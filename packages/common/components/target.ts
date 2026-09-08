import type { ComponentTarget } from '@boluo/api';

export const componentTargetsMatch = (
  requested: ComponentTarget,
  actual: ComponentTarget,
): boolean =>
  requested.scopeId === actual.scopeId &&
  requested.componentType === actual.componentType &&
  (requested.entryId != null ? requested.entryId === actual.entryId : requested.key === actual.key);
