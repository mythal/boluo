import type { ComponentPayload } from '@boluo/api';

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
