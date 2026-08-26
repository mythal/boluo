import { get } from '@boluo/api-browser';
import { store } from '@boluo/store';
import { chatAtom } from './chat.atoms';
import { isOlderMessagesPageCurrent } from './channel.reducer';

interface LoadChannelMessagesBaseOptions {
  channelId: string;
  limit: number;
}

type LoadChannelMessagesOptions = LoadChannelMessagesBaseOptions &
  (
    | { mode: 'INITIAL' }
    | {
        before: number;
        mode: 'LOAD_MORE';
      }
  );

export type LoadChannelMessagesStatus =
  | 'APPLIED'
  | 'FAILED'
  | 'STALE_PAGE'
  | 'STALE_SESSION';

const loadOutcome = <Result>(result: Result, status: LoadChannelMessagesStatus) => ({
  result,
  status,
});

const isCurrentChatSession = (spaceId: string, sessionGeneration: number): boolean => {
  const context = store.get(chatAtom).context;
  return context.spaceId === spaceId && context.sessionGeneration === sessionGeneration;
};

export const loadChannelMessages = async (options: LoadChannelMessagesOptions) => {
  const { channelId, limit, mode } = options;
  const initial = mode === 'INITIAL';

  if (initial) {
    store.set(chatAtom, { type: 'initialHistoryLoadStarted', payload: { channelId } });
  }
  const chatState = store.get(chatAtom);
  const { sessionGeneration, spaceId } = chatState.context;
  const loadMoreRequest =
    mode === 'LOAD_MORE'
      ? {
          before: options.before,
          historyMutationGeneration: chatState.channels[channelId]?.historyMutationGeneration ?? 0,
        }
      : null;
  const before = loadMoreRequest?.before ?? null;

  try {
    const result = await get('/messages/by_channel', {
      before,
      channelId,
      limit,
      spaceId,
    });
    if (!isCurrentChatSession(spaceId, sessionGeneration)) {
      return loadOutcome(result, 'STALE_SESSION');
    }

    if (result.isErr) {
      if (initial) {
        store.set(chatAtom, { type: 'initialHistoryLoadFailed', payload: { channelId } });
      }
      return loadOutcome(result, 'FAILED');
    }

    const historyExhausted = result.some.length < limit;
    if (loadMoreRequest == null) {
      store.set(chatAtom, {
        type: 'initialHistoryLoaded',
        payload: { channelId, messages: result.some, historyExhausted },
      });
    } else {
      const currentChannelState = store.get(chatAtom).channels[channelId];
      if (!isOlderMessagesPageCurrent(currentChannelState, loadMoreRequest)) {
        return loadOutcome(result, 'STALE_PAGE');
      }
      store.set(chatAtom, {
        type: 'olderMessagesLoaded',
        payload: {
          before: loadMoreRequest.before,
          channelId,
          messages: result.some,
          historyExhausted,
          historyMutationGeneration: loadMoreRequest.historyMutationGeneration,
        },
      });
    }
    return loadOutcome(result, 'APPLIED');
  } catch (error) {
    if (initial && isCurrentChatSession(spaceId, sessionGeneration)) {
      store.set(chatAtom, { type: 'initialHistoryLoadFailed', payload: { channelId } });
    }
    throw error;
  }
};
