import { post } from '@boluo/api-browser';
import type { ApiError, EntryComponentHistory, ComponentReportEntity } from '@boluo/api';
import { unwrap } from '@boluo/utils/result';
import useSWR from 'swr';
import { useChannel } from '../../hooks/useChannel';
import { ComponentReport } from './ComponentReport';
import { componentChangesFromHistory } from '../../entries/component-history';

export const MessageComponentChanges = ({
  messageId,
  hasEntryEffects = true,
  entity,
  source,
}: {
  messageId?: string;
  hasEntryEffects?: boolean;
  entity?: ComponentReportEntity;
  source?: string;
}) => {
  const spaceId = useChannel()?.spaceId;
  const key =
    spaceId && messageId && hasEntryEffects
      ? (['/entries/effects_by_messages', spaceId, messageId] as const)
      : null;
  const { data, error } = useSWR<EntryComponentHistory[], ApiError, typeof key>(
    key,
    async ([, spaceId, messageId]) => {
      const messages = await post('/entries/effects_by_messages', null, {
        spaceId,
        messageIds: [messageId],
      }).then(unwrap);
      const history = messages.flatMap((message) =>
        message.effects.flatMap((effect) => effect.componentHistory),
      );
      return history;
    },
  );
  const changes = componentChangesFromHistory(data ?? []);
  let loadState: 'ready' | 'loading' | 'error' = 'ready';
  if (error) loadState = 'error';
  else if (key != null && data == null) loadState = 'loading';
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
