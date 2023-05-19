import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { Dispatch, SetStateAction, useMemo, useRef, useState } from 'react';
import { binarySearchPos } from '../sort';
import { ChannelState } from '../state/channel.reducer';
import { useIsFocused } from '../state/chat-view';
import { chatAtom } from '../state/chat.atoms';
import { ComposeState } from '../state/compose.reducer';
import { ChatItem, MessageItem, PreviewItem } from '../types/chat-items';
import { useComposeAtom } from './useComposeAtom';

export type SetOptimisticItems = Dispatch<SetStateAction<Record<string, OptimisticItem>>>;

interface UseChatListReturn {
  chatList: ChatItem[];
  setOptimisticItems: SetOptimisticItems;
  firstItemIndex: number;
}

export interface OptimisticItem {
  optimisticPos: number;
  timestamp: number;
  item: MessageItem | PreviewItem;
}
const START_INDEX = 100000000;

type ComposeSlice = Pick<ComposeState, 'previewId' | 'editFor'> & {
  prevPreviewId: string | null;
  show: boolean;
};

const selectComposeSlice = (
  { source, previewId, editFor, focused }: ComposeState,
  prevSlice: ComposeSlice | null | undefined,
): ComposeSlice => {
  const empty = source.trim().length === 0;

  let prevPreviewId: string | null = null;
  if (prevSlice) {
    if (prevSlice.previewId !== previewId) {
      prevPreviewId = prevSlice.previewId;
    } else {
      prevPreviewId = prevSlice.prevPreviewId;
    }
  }

  return { previewId, editFor, prevPreviewId, show: !empty || focused };
};

export const useChatList = (channelId: string, myId?: string): UseChatListReturn => {
  const isFocused = useIsFocused();
  const composeAtom = useComposeAtom();
  const composeSliceAtom = useMemo(
    () => selectAtom(composeAtom, selectComposeSlice, (a, b) => a.previewId === b.previewId && a.show === b.show),
    [composeAtom],
  );
  const composeSlice = useAtomValue(composeSliceAtom);

  const messagesAtom = useMemo(
    () =>
      selectAtom(chatAtom, (chat): [ChannelState['messages'] | null, ChannelState['messageMap'] | null] => {
        const channel = chat.channels[channelId];
        if (!channel) return [null, null];
        return [channel.messages, channel.messageMap];
      }, (a, b) => a?.[1] === b?.[1]),
    [channelId],
  );
  const previewMapAtom = useMemo(
    () => selectAtom(chatAtom, (chat) => chat.channels[channelId]?.previewMap),
    [channelId],
  );
  const [messages, messageMap] = useAtomValue(messagesAtom);
  const previewMap = useAtomValue(previewMapAtom);

  const [optimisticItemMap, setOptimisticItems] = useState<Record<string, OptimisticItem>>({});
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX); // can't be negative
  const chatList = useMemo((): ChatItem[] => {
    if (!messages || !messageMap || !previewMap) return [];
    const previews = Object.values(previewMap);
    const optimisticMessageItems: OptimisticItem[] = [];
    const itemList: ChatItem[] = messages.filter(item => {
      const optimisticItem = optimisticItemMap[item.id];
      if (!optimisticItem || optimisticItem.item.pos !== item.pos || optimisticItem.item.type !== 'MESSAGE') {
        return true;
      }
      const itemTimestamp = Date.parse(item.modified);
      if (itemTimestamp >= optimisticItem.timestamp) {
        return true;
      } else {
        optimisticMessageItems.push(optimisticItem);
        return false;
      }
    });
    const minPos = itemList.length > 0 ? itemList[0]!.pos : Number.MIN_SAFE_INTEGER;
    if (myId && isFocused && composeSlice.show && previews.every(preview => preview.senderId !== myId)) {
      let pos = 0;
      let posP = pos;
      let posQ = 1;
      if (composeSlice.editFor !== null) {
        const message = messageMap[composeSlice.previewId];
        if (message) {
          pos = message.pos;
          posP = message.posP;
          posQ = message.posQ;
        }
      }
      previews.push({
        type: 'PREVIEW',
        pos,
        posP,
        posQ,
        id: composeSlice.previewId,
        senderId: myId,
        channelId,
        parentMessageId: null,
        name: 'dummy',
        mediaId: null,
        inGame: false,
        isAction: false,
        isMaster: false,
        clear: false,
        text: 'dummy',
        whisperToUsers: null,
        entities: [],
        editFor: composeSlice.editFor,
        optimistic: true,
        key: myId,
      });
    }
    for (const preview of previews) {
      if (isFocused && preview.senderId === myId) {
        /* Always show preview when the compose is focused */
      } else if (preview.text === '' || preview.id === composeSlice.prevPreviewId) {
        continue;
      }
      if (preview.id in messageMap) {
        // A edit preview
        const message = messageMap[preview.id]!;
        if (preview.editFor !== message.modified) {
          continue;
        }
        const index = binarySearchPos(itemList, message.pos);
        if (message.id !== itemList[index]?.id) {
          throw new Error('Failed binary search');
        }
        if (message.pos === preview.pos) {
          itemList[index] = preview;
          continue;
        } else {
          itemList.splice(index, 1);
        }
      } else if (preview.editFor) {
        continue;
      }
      // Insert the preview to item list
      if (preview.optimistic && !preview.editFor) {
        itemList.push(preview);
      } else if (preview.pos > minPos) {
        const index = binarySearchPos(itemList, preview.pos);
        itemList.splice(index, 0, preview);
      }
    }
    for (const optimisticItem of optimisticMessageItems) {
      const { item, optimisticPos } = optimisticItem;
      itemList.splice(
        binarySearchPos(itemList, optimisticPos),
        0,
        item,
      );
    }

    return itemList;
  }, [
    channelId,
    composeSlice.editFor,
    composeSlice.prevPreviewId,
    composeSlice.previewId,
    composeSlice.show,
    isFocused,
    messageMap,
    messages,
    myId,
    optimisticItemMap,
    previewMap,
  ]);

  // Compute firstItemIndex for prepending items
  // https://virtuoso.dev/prepend-items/
  const prevChatListRef = useRef<ChatItem[] | null>(null);
  if (prevChatListRef.current !== null) {
    const prevChatList = prevChatListRef.current;
    if (
      prevChatList.length > 0
      && chatList.length > prevChatList.length
    ) {
      const prevFirstItem = prevChatList[0]!;
      if (prevFirstItem.id !== chatList[0]!.id) {
        const prevFirstItemNewIndex = chatList.findIndex(item => item.id === prevFirstItem.id);
        setFirstItemIndex((prev) => {
          if (prevFirstItemNewIndex !== -1) {
            return prev - prevFirstItemNewIndex;
          } else {
            console.warn('Lost the previous first item');
            const lengthDiff = chatList.length - prevChatList.length;
            return prev - lengthDiff;
          }
        });
      }
    }
  }
  prevChatListRef.current = chatList;

  return { chatList, setOptimisticItems, firstItemIndex };
};
