import type { ComponentRef } from '@boluo/api';

export const componentRefsMatch = (requested: ComponentRef, actual: ComponentRef): boolean =>
  requested.scopeId === actual.scopeId &&
  requested.componentType === actual.componentType &&
  (requested.entryId != null ? requested.entryId === actual.entryId : requested.key === actual.key);
