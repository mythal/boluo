import type { ComponentPayload, ComponentReportEntity, EntryEffectHistory } from '@boluo/api';
import { componentTargetsMatch } from '@boluo/common/components/target';
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
      .flatMap((target) => {
        const changes = history.filter((change) => componentTargetsMatch(target, change));
        if (!changes.length) {
          return `${target.key}: ${intl.formatMessage({ defaultMessage: 'Change not confirmed' })}`;
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
        const name = item.displayName || item.target.key;
        const label = name === item.target.key ? name : `${name} (${item.target.key})`;
        if ('payload' in item) {
          return `${label}: ${payloadText(intl, item.target.componentType, item.payload)}`;
        }
        const before = payloadText(intl, item.target.componentType, item.before);
        const after = payloadText(intl, item.target.componentType, item.after);
        return `${intl.formatMessage({ defaultMessage: 'Preview' })}: ${label}: ${before} → ${after}`;
      })
      .join('\n') || intl.formatMessage({ defaultMessage: 'No components.' })
  );
};
