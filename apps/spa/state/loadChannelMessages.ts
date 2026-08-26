import { get } from '@boluo/api-browser';
import { store } from '@boluo/store';
import { chatAtom } from './chat.atoms';

interface LoadChannelMessagesBaseOptions {
  channelId: string;
  limit: number;
}

type LoadChannelMessagesOptions = LoadChannelMessagesBaseOptions &
  (
    | { mode: 'INITIAL' }
    | {
        before: number | null;
        mode: 'LOAD_MORE';
      }
  );

const isCurrentChatSession = (spaceId: string, sessionGeneration: number): boolean => {
  const context = store.get(chatAtom).context;
  return context.spaceId === spaceId && context.sessionGeneration === sessionGeneration;
};

export const loadChannelMessages = async (options: LoadChannelMessagesOptions) => {
  const { channelId, limit, mode } = options;
  const initial = mode === 'INITIAL';
  const before = mode === 'LOAD_MORE' ? options.before : null;

  if (initial) {
    store.set(chatAtom, { type: 'initialHistoryLoadStarted', payload: { channelId } });
  }
  const { sessionGeneration, spaceId } = store.get(chatAtom).context;

  try {
    const result = await get('/messages/by_channel', {
      before,
      channelId,
      limit,
      spaceId,
    });
    if (!isCurrentChatSession(spaceId, sessionGeneration)) {
      return result;
    }

    if (result.isErr) {
      if (initial) {
        store.set(chatAtom, { type: 'initialHistoryLoadFailed', payload: { channelId } });
      }
      return result;
    }

    store.set(chatAtom, {
      type: 'messagesLoaded',
      payload: {
        before,
        channelId,
        messages: result.some,
        historyExhausted: result.some.length < limit,
      },
    });
    return result;
  } catch (error) {
    if (initial && isCurrentChatSession(spaceId, sessionGeneration)) {
      store.set(chatAtom, { type: 'initialHistoryLoadFailed', payload: { channelId } });
    }
    throw error;
  }
};
