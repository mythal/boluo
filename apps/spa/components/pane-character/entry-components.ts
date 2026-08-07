import type { EntryComponent } from '@boluo/api';
import { z } from 'zod';

export const COUNTER_COMPONENT_TYPE = 'core/counter';
export const COUNTER_SCHEMA_VERSION = 1;

const counterDataSchema = z.object({
  value: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export type CounterData = z.infer<typeof counterDataSchema>;

export const parseCounterComponent = (
  component: EntryComponent | undefined,
): CounterData | null => {
  if (
    component == null ||
    component.payloadType !== 'JSON' ||
    component.schemaVersion !== COUNTER_SCHEMA_VERSION
  ) {
    return null;
  }
  const result = counterDataSchema.safeParse(component.data);
  return result.success ? result.data : null;
};

export const formatCounterValue = (data: CounterData): string => {
  if (data.max == null) return String(data.value);
  return `${data.value} / ${data.max}`;
};
