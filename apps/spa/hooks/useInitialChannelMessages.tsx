import { get } from '@boluo/api-browser';
import { useSetAtom, useStore, useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useEffect, useMemo, useRef } from 'react';
import { chatAtom, isChatInitializedAtom } from '../state/chat.atoms';
import { useQueryChannelList } from './useQueryChannelList';
import { panesAtom } from '../state/view.atoms';

const INITIAL_LOAD_LIMIT = 5;

export const useInitialChannelMessages = (spaceId: string) => {
  const { data: channelWithMemberList } = useQueryChannelList(spaceId);
  const initialized = useAtomValue(isChatInitializedAtom);
  const store = useStore();
  const dispatch = useSetAtom(chatAtom);
  const requestedRef = useRef<Set<string>>(new Set());
  const openChannelIds = useAtomValue(
    useMemo(
      () =>
        selectAtom(panesAtom, (panes) => {
          const ids: string[] = [];
          for (const pane of panes) {
            if (pane.type === 'CHANNEL') ids.push(pane.channelId);
            const childPane = pane.child?.pane;
            if (childPane?.type === 'CHANNEL') ids.push(childPane.channelId);
          }
          return ids;
        }),
      [],
    ),
  );

  useEffect(() => {
    if (!initialized) return;
    if (!channelWithMemberList) return;

    const chatState = store.get(chatAtom);

    for (const { channel } of channelWithMemberList) {
      if (channel.isArchived) continue;
      const channelId = channel.id;
      if (requestedRef.current.has(channelId)) continue;
      if (openChannelIds.includes(channelId)) {
        requestedRef.current.add(channelId);
        continue;
      }

      const hasMessages = chatState.channels[channelId]?.messages.length;
      if (hasMessages && hasMessages > 0) {
        requestedRef.current.add(channelId);
        continue;
      }

      requestedRef.current.add(channelId);
      void get('/messages/by_channel', {
        channelId,
        before: null,
        limit: INITIAL_LOAD_LIMIT,
      }).then((result) => {
        if (result.isErr) return;
        const messages = result.some;
        dispatch({
          type: 'messagesLoaded',
          payload: {
            before: null,
            channelId,
            messages,
            fullLoaded: messages.length < INITIAL_LOAD_LIMIT,
          },
        });
      });
    }
  }, [channelWithMemberList, dispatch, initialized, openChannelIds, store]);
};
