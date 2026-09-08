import type { ComponentReportEntity } from '@boluo/api';
import { readCounterPayload } from '@boluo/common/components/counter';

export interface ComponentReportTextLabels {
  variableUpdate: string;
  componentUpdate: string;
  deleted: string;
  unsupportedComponent: string;
  preview: string;
  empty: string;
}

const defaultLabels: ComponentReportTextLabels = {
  variableUpdate: 'Variable update',
  componentUpdate: 'Component update',
  deleted: 'deleted',
  unsupportedComponent: 'Unsupported component',
  preview: 'Preview',
  empty: 'No variables yet.',
};

export const componentReportToText = (
  entity: ComponentReportEntity,
  labels: ComponentReportTextLabels = defaultLabels,
): string => {
  if (entity.report.type === 'Change') {
    const label = entity.report.items.every((item) => item.componentType === 'core/counter')
      ? labels.variableUpdate
      : labels.componentUpdate;
    return `${label}: ${entity.report.items.map((item) => item.key).join(', ')}`;
  }
  const preview = entity.report.type === 'ChangePreview';
  return (
    entity.report.items
      .map((item) => {
        const beforePayload = 'before' in item ? item.before : null;
        const afterPayload = 'payload' in item ? item.payload : item.after;
        const before = readCounterPayload(beforePayload);
        const after = readCounterPayload(afterPayload);
        const supported =
          item.component.componentType === 'core/counter' &&
          (beforePayload === null || before != null) &&
          (afterPayload === null || after != null);
        const label = item.displayName || item.component.key;
        const value = supported
          ? `${after?.value ?? labels.deleted}${!preview && after?.max != null ? ` / ${after?.max}` : ''}`
          : labels.unsupportedComponent;
        return `${preview ? `${labels.preview}: ` : ''}${label}: ${value}`;
      })
      .join('\n') || labels.empty
  );
};
