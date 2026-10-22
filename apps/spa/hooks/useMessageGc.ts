import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { chatAtom } from '../state/chat.atoms';
import type { ChatAction } from '../state/chat.actions';
import type { ChatItem } from '../state/channel.types';
import { useChannelAtoms } from './useChannelAtoms';

const readyGcAtom = selectAtom(
  chatAtom,
  (chat): ChatAction<'runGc'>['payload'][] =>
    Object.values(chat.channels).flatMap(({ id, scheduledGc }) =>
      scheduledGc != null ? [{ channelId: id, lowerPos: scheduledGc.lowerPos }] : [],
    ),
  (a, b) =>
    a.length === b.length &&
    a.every((plan, i) => plan.channelId === b[i]!.channelId && plan.lowerPos === b[i]!.lowerPos),
);

/** Collect all ready channels, including those without a mounted message list. */
export const useMessageGc = () => {
  const plans = useAtomValue(readyGcAtom);
  const dispatch = useSetAtom(chatAtom);
  useEffect(() => {
    // Mounted lists protect their rendered range in layout effects before this runs.
    for (const plan of plans) {
      dispatch({ type: 'runGc', payload: plan });
    }
  }, [dispatch, plans]);
};

export const useMessageGcProtection = (channelId: string, chatList: ChatItem[]) => {
  const store = useStore();
  const { scrollToMessageAtom } = useChannelAtoms();
  const scrollToMessage = useAtomValue(scrollToMessageAtom);
  const boundaryAtom = useMemo(
    () => selectAtom(chatAtom, (chat) => chat.channels[channelId]?.scheduledGc?.lowerPos ?? null),
    [channelId],
  );
  const scheduledGcLowerPos = useAtomValue(boundaryAtom);
  const firstRenderedIndex = useRef(0);
  const protectRenderedMessages = useCallback(
    (index: number) => {
      const channel = store.get(chatAtom).channels[channelId];
      if (!channel?.scheduledGc) return;
      const request = store.get(scrollToMessageAtom);
      // Keep the history leading to a pending target, even before it has been loaded.
      const targetPos = request
        ? (channel.messages.get(request.messageId)?.pos ?? request.pos)
        : Infinity;
      const lowerPos = Math.min(chatList[index]?.pos ?? Infinity, targetPos);
      if (lowerPos >= channel.scheduledGc.lowerPos) return;
      store.set(chatAtom, { type: 'resetGc', payload: { channelId, pos: lowerPos } });
    },
    [channelId, chatList, scrollToMessageAtom, store],
  );

  useLayoutEffect(() => {
    protectRenderedMessages(firstRenderedIndex.current);
  }, [protectRenderedMessages, scheduledGcLowerPos, scrollToMessage]);

  return useCallback(
    (index: number) => {
      firstRenderedIndex.current = index;
      // Scrolling changes the range without necessarily re-rendering the parent view.
      protectRenderedMessages(index);
    },
    [protectRenderedMessages],
  );
};
