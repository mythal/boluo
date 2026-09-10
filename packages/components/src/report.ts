import type { ComponentReportEntity } from '@boluo/types/bindings';
import { readCounterReportItem } from './counter';

export interface ComponentReportTextLabels {
  counterUpdate: string;
  componentUpdate: string;
  deleted: string;
  unsupportedComponent: string;
  preview: string;
  empty: string;
}

const defaultLabels: ComponentReportTextLabels = {
  counterUpdate: 'Counter update',
  componentUpdate: 'Component update',
  deleted: 'deleted',
  unsupportedComponent: 'Unsupported component',
  preview: 'Preview',
  empty: 'No components.',
};

export const componentReportToText = (
  entity: ComponentReportEntity,
  labels: ComponentReportTextLabels = defaultLabels,
): string => {
  if (entity.report.type === 'Change') {
    const label = entity.report.items.every((item) => item.componentType === 'core/counter')
      ? labels.counterUpdate
      : labels.componentUpdate;
    return `${label}: ${entity.report.items.map((item) => item.key).join(', ')}`;
  }
  const preview = entity.report.type === 'ChangePreview';
  return (
    entity.report.items
      .map((item) => {
        const counter = readCounterReportItem(item);
        const label = item.displayName || item.component.key;
        const value = counter
          ? `${counter.after?.value ?? labels.deleted}${!preview && counter.after?.max != null ? ` / ${counter.after?.max}` : ''}`
          : labels.unsupportedComponent;
        return `${preview ? `${labels.preview}: ` : ''}${label}: ${value}`;
      })
      .join('\n') || labels.empty
  );
};
