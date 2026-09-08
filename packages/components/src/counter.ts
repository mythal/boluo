import type {
  ComponentPayload,
  ComponentSnapshot,
  ComponentChangePreview,
} from '@boluo/types/bindings';

export const readCounterPayload = (payload: ComponentPayload | null) => {
  if (payload?.payloadType !== 'JSON' || payload.schemaVersion !== 1) return null;
  const data = payload.data;
  if (
    data == null ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    typeof data.value !== 'number'
  )
    return null;
  if (data.min != null && typeof data.min !== 'number') return null;
  if (data.max != null && typeof data.max !== 'number') return null;
  return { value: data.value, min: data.min ?? null, max: data.max ?? null };
};

export const readCounterReportItem = (item: ComponentSnapshot | ComponentChangePreview) => {
  if (item.component.componentType !== 'core/counter') return null;
  const beforePayload = 'before' in item ? item.before : null;
  const afterPayload = 'payload' in item ? item.payload : item.after;
  const before = readCounterPayload(beforePayload);
  const after = readCounterPayload(afterPayload);
  if ((beforePayload !== null && !before) || (afterPayload !== null && !after)) return null;
  return { before, after };
};
