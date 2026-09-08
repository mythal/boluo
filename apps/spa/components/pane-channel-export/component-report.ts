import type { ComponentPayload, ComponentReportEntity, EntryEffectHistory } from '@boluo/api';
import { componentRefsMatch } from '@boluo/common/components/ref';
import { readCounterPayload } from '@boluo/common/components/counter';
import type { IntlShape } from 'react-intl';

const payloadText = (intl: IntlShape, componentType: string, payload: ComponentPayload | null) => {
  if (payload == null) return intl.formatMessage({ defaultMessage: 'Absent' });
  if (payload.payloadType === 'ASSET') return `asset:${payload.assetId}`;
  const data = readCounterPayload(payload);
  if (componentType === 'core/counter' && data) {
    return String(data.value);
  }
  return JSON.stringify(payload.data);
};

export const exportComponentReportText = (
  intl: IntlShape,
  entity: ComponentReportEntity,
  effects: readonly EntryEffectHistory[],
): string => {
  const { report } = entity;
  if (report.type === 'Change') {
    const history = effects.flatMap((effect) => effect.componentHistory);
    return report.items
      .flatMap((component) => {
        const changes = history.filter((change) => componentRefsMatch(component, change));
        if (!changes.length) {
          return `${component.key}: ${intl.formatMessage({ defaultMessage: 'Change not confirmed' })}`;
        }
        return changes.map((change) => {
          const before = payloadText(intl, change.componentType, change.beforePayload);
          const after = payloadText(
            intl,
            change.componentType,
            change.action === 'REMOVE' ? null : change.payload,
          );
          return `${change.key}: ${before} → ${after}`;
        });
      })
      .join('\n');
  }
  return (
    report.items
      .map((item) => {
        const name = item.displayName || item.component.key;
        const label = name === item.component.key ? name : `${name} (${item.component.key})`;
        if ('payload' in item) {
          return `${label}: ${payloadText(intl, item.component.componentType, item.payload)}`;
        }
        const before = payloadText(intl, item.component.componentType, item.before);
        const after = payloadText(intl, item.component.componentType, item.after);
        return `${intl.formatMessage({ defaultMessage: 'Preview' })}: ${label}: ${before} → ${after}`;
      })
      .join('\n') || intl.formatMessage({ defaultMessage: 'No components.' })
  );
};
