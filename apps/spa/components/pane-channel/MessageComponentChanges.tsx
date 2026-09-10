import type { ComponentReportEntity } from '@boluo/api';
import { useMessageComponentHistory } from '../../entries/useMessageComponentHistory';
import { useChannel } from '../../hooks/useChannel';
import { ComponentReport } from './ComponentReport';
import { componentChangesFromHistory } from '../../entries/component-history';

export const MessageComponentChanges = ({
  messageId,
  messageRevision,
  entity,
  source,
}: {
  messageId: string;
  messageRevision?: number;
  entity?: ComponentReportEntity;
  source?: string;
}) => {
  const spaceId = useChannel()?.spaceId;
  const { data, error } = useMessageComponentHistory(spaceId, messageId, messageRevision);
  const changes = componentChangesFromHistory(data ?? []);
  let loadState: 'ready' | 'loading' | 'error' = 'ready';
  if (error) loadState = 'error';
  else if (data == null) loadState = 'loading';
  return (
    <ComponentReport
      source={source}
      entity={
        entity ?? {
          start: 0,
          len: 0,
          report: { type: 'Change', items: changes.map(({ component }) => component) },
        }
      }
      changes={changes}
      loadState={loadState}
    />
  );
};
