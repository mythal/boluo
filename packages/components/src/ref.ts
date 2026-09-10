import type { ComponentRef } from '@boluo/types/bindings';

export const componentRefsMatch = (requested: ComponentRef, actual: ComponentRef): boolean =>
  requested.scopeId === actual.scopeId &&
  requested.componentType === actual.componentType &&
  (requested.entryId != null
    ? requested.entryId === actual.entryId
    : requested.key.toLowerCase() === actual.key.toLowerCase());
