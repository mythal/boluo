import type { ApiError, EntryComponentHistory } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { unwrap } from '@boluo/utils/result';
import useSWR from 'swr';

const messageHistoryPrefix = (spaceId: string, messageId: string) =>
  ['/entries/effects_by_messages', spaceId, messageId] as const;

export const matchesMessageComponentHistory = (spaceId: string, messageId: string) => {
  const prefix = messageHistoryPrefix(spaceId, messageId);
  return (key: unknown): boolean =>
    Array.isArray(key) && prefix.every((value, index) => key[index] === value);
};

export const useMessageComponentHistory = (
  spaceId: string | undefined,
  messageId: string,
  messageRevision = 0,
) => {
  const key = spaceId
    ? ([...messageHistoryPrefix(spaceId, messageId), messageRevision] as const)
    : null;
  return useSWR<EntryComponentHistory[], ApiError, typeof key>(
    key,
    async ([, spaceId, messageId]) => {
      const messages = await post('/entries/effects_by_messages', null, {
        spaceId,
        messageIds: [messageId],
      }).then(unwrap);
      return messages.flatMap((message) =>
        message.effects.flatMap((effect) => effect.componentHistory),
      );
    },
  );
};
