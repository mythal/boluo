import { useAtomValue, useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { type Dispatch, type SetStateAction, useMemo, useRef, useState } from 'react';
import { binarySearchPos } from '../sort';
import { type ChannelState } from '../state/channel.reducer';
import { type ChatItem, type MessageItem, type PreviewItem } from '../state/channel.types';
import { chatAtom } from '../state/chat.atoms';
import { type ComposeState } from '../state/compose.reducer';
import { type ChannelFilter, useChannelAtoms } from './useChannelAtoms';
import { recordWarn } from '../error';

export type SetOptimisticItems = Dispatch<SetStateAction<Record<string, OptimisticItem>>>;

interface UseChatListReturn {
  chatList: ChatItem[];
  setOptimisticItems: SetOptimisticItems;
  firstItemIndex: number;
  filteredMessagesCount: number;
  scheduledGcLowerPos: number | null;
}

export interface OptimisticItem {
  optimisticPos: number;
  timestamp: number;
  item: MessageItem | PreviewItem;
}
export const START_INDEX = 100000000;

type ComposeSlice = Pick<ComposeState, 'previewId' | 'editFor'> & {
  prevPreviewId: string | null;
};

const selectComposeSlice = (
  { previewId, editFor }: ComposeState,
  prevSlice: ComposeSlice | null | undefined,
): ComposeSlice => {
  let prevPreviewId: string | null = null;
  if (prevSlice) {
    if (prevSlice.previewId !== previewId) {
      prevPreviewId = prevSlice.previewId;
    } else {
      prevPreviewId = prevSlice.prevPreviewId;
    }
  }

  return { previewId, editFor, prevPreviewId };
};

const isComposeSliceEq = (a: ComposeSlice, b: ComposeSlice) => a.previewId === b.previewId && a.editFor === b.editFor;

const filter = (type: ChannelFilter, item: ChatItem) => {
  if (type === 'OOC' && item.inGame) return false;
  if (type === 'IN_GAME' && !item.inGame) return false;
  return true;
};

const makeDummyPreview = (
  id: string,
  myId: string,
  channelId: string,
  inGame: boolean,
  editFor: string | null,
  pos: number,
  posP: number,
  posQ: number,
): PreviewItem => ({
  id,
  type: 'PREVIEW',
  pos,
  posP,
  posQ,
  senderId: myId,
  channelId,
  parentMessageId: null,
  name: 'dummy',
  mediaId: null,
  inGame,
  isAction: false,
  isMaster: false,
  clear: false,
  text: 'You should not seen this message, Please report a bug.',
  whisperToUsers: null,
  entities: [],
  editFor,
  optimistic: true,
  key: myId,
  timestamp: new Date().getTime(),
});

export const useChatList = (channelId: string, myId?: string): UseChatListReturn => {
  const store = useStore();
  const { composeAtom, filterAtom, showArchivedAtom, parsedAtom } = useChannelAtoms();
  const showArchived = useAtomValue(showArchivedAtom);
  const filterType = useAtomValue(filterAtom);
  const composeSliceAtom = useMemo(() => selectAtom(composeAtom, selectComposeSlice, isComposeSliceEq), [composeAtom]);
  const composeSlice = useAtomValue(composeSliceAtom);

  // Intentionally quit reactivity
  const isEmpty = store.get(parsedAtom).entities.length === 0;

  const messagesAtom = useMemo(
    () =>
      selectAtom(
        chatAtom,
        (chat): [ChannelState['messages'] | null, ChannelState['messageMap'] | null] => {
          const channel = chat.channels[channelId];
          if (!channel) return [null, null];
          return [channel.messages, channel.messageMap];
        },
        (a, b) => a?.[1] === b?.[1],
      ),
    [channelId],
  );
  const previewMapAtom = useMemo(
    () => selectAtom(chatAtom, (chat) => chat.channels[channelId]?.previewMap),
    [channelId],
  );
  const scheduledGcLowerPosAtom = useMemo(
    () => selectAtom(chatAtom, (chat) => chat.channels[channelId]?.scheduledGc?.lowerPos ?? null),
    [channelId],
  );
  const [messages, messageMap] = useAtomValue(messagesAtom);
  const previewMap = useAtomValue(previewMapAtom);
  const scheduledGcLowerPos = useAtomValue(scheduledGcLowerPosAtom);

  const [optimisticItemMap, setOptimisticItems] = useState<Record<string, OptimisticItem>>({});
  const firstItemIndex = useRef(START_INDEX); // can't be negative
  const { chatList, filteredMessagesCount } = useMemo((): Pick<
    UseChatListReturn,
    'chatList' | 'filteredMessagesCount'
  > => {
    if (!messages || !messageMap || !previewMap) return { chatList: [], filteredMessagesCount: 0 };
    const optimisticPreviewMap = { ...previewMap };
    const optimisticMessageItems: OptimisticItem[] = [];
    const itemList: ChatItem[] = messages.filter((item) => {
      const isFiltered = !filter(filterType, item);
      if (item.type === 'MESSAGE' && item.folded && !showArchived) return false;
      if (isFiltered) {
        return false;
      }
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
    const filteredMessagesCount = messages.length - itemList.length;
    const minPos = itemList.length > 0 ? itemList[0]!.pos : Number.MIN_SAFE_INTEGER;
    if (myId) {
      const existsPreview = optimisticPreviewMap[myId];
      if (existsPreview && (existsPreview.id !== composeSlice.previewId || isEmpty)) {
        delete optimisticPreviewMap[myId];
      }
      if (!(myId in optimisticPreviewMap)) {
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
        optimisticPreviewMap[myId] = makeDummyPreview(
          composeSlice.previewId,
          myId,
          channelId,
          true,
          composeSlice.editFor,
          pos,
          posP,
          posQ,
        );
      }
    }
    for (const preview of Object.values(optimisticPreviewMap)) {
      const isFiltered = !filter(filterType, preview);
      if (isFiltered) continue;
      else if (preview.senderId === myId) {
        /* Always show the user's own preview */
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
          // Maybe the original message be filtered
          // Just treat it as a normal preview
        } else if (message.pos === preview.pos) {
          // In-place replace
          itemList[index] = preview;
          continue;
        } else {
          // Remove the original message
          itemList.splice(index, 1);
        }
      } else if (preview.editFor) {
        // The preview is editing a message that is not loaded.
        continue;
      }
      // Insert the preview to item list
      if (preview.optimistic && !preview.editFor) {
        itemList.push(preview);
      } else if (preview.text === '' && preview.senderId === myId) {
        itemList.push(preview);
      } else if (preview.pos > minPos) {
        const index = binarySearchPos(itemList, preview.pos);
        itemList.splice(index, 0, preview);
      }
    }
    for (const optimisticItem of optimisticMessageItems) {
      const { item, optimisticPos } = optimisticItem;
      itemList.splice(binarySearchPos(itemList, optimisticPos), 0, item);
    }

    return { chatList: itemList, filteredMessagesCount };
  }, [
    channelId,
    composeSlice.editFor,
    composeSlice.prevPreviewId,
    composeSlice.previewId,
    filterType,
    isEmpty,
    messageMap,
    messages,
    myId,
    optimisticItemMap,
    previewMap,
    showArchived,
  ]);

  // Compute firstItemIndex for prepending items
  // https://virtuoso.dev/prepend-items/
  const prevChatListRef = useRef<ChatItem[] | null>(null);
  if (prevChatListRef.current !== null) {
    const prevChatList = prevChatListRef.current;
    if (prevChatList.length > 0 && chatList.length > prevChatList.length) {
      const prevFirstItem = prevChatList[0]!;
      if (prevFirstItem.id !== chatList[0]!.id) {
        const prevFirstItemNewIndex = chatList.findIndex((item) => item.id === prevFirstItem.id);
        const prevFirstItemIndex = firstItemIndex.current;
        if (prevFirstItemNewIndex !== -1) {
          firstItemIndex.current = prevFirstItemIndex - prevFirstItemNewIndex;
        } else {
          recordWarn('Lost the previous first item');
          const lengthDiff = chatList.length - prevChatList.length;
          firstItemIndex.current = prevFirstItemIndex - lengthDiff;
        }
      }
    }
  }
  prevChatListRef.current = chatList;

  return {
    chatList,
    setOptimisticItems,
    firstItemIndex: firstItemIndex.current,
    filteredMessagesCount,
    scheduledGcLowerPos,
  };
};
