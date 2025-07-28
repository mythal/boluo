import { useAtomValue, useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { binarySearchPos } from '../sort';
import { findMessage, type OptimisticItem, type ChannelState } from '../state/channel.reducer';
import { type ChatItem, type PreviewItem } from '../state/channel.types';
import { chatAtom } from '../state/chat.atoms';
import { type ComposeState } from '../state/compose.reducer';
import { type ChannelAtoms, type ChannelFilter, useChannelAtoms } from './useChannelAtoms';
import { recordWarn } from '../error';
import { type PreviewEdit } from '@boluo/api';
import * as L from 'list';

interface UseChatListReturn {
  chatList: ChatItem[];
  firstItemIndex: number;
  filteredMessagesCount: number;
  scheduledGcLowerPos: number | null;
}

export const START_INDEX = 100000000;

type ComposeSlice = Pick<ComposeState, 'previewId' | 'edit'> & {
  prevPreviewId: string | null;
};

const selectComposeSlice = (
  { previewId, edit }: ComposeState,
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

  return { previewId, edit, prevPreviewId };
};

const isComposeSliceEq = (a: ComposeSlice, b: ComposeSlice) =>
  a.previewId === b.previewId && a.edit?.time === b.edit?.time;

const filter = (type: ChannelFilter, item: ChatItem) => {
  if (type === 'OOC' && item.inGame) return false;
  if (type === 'IN_GAME' && !item.inGame) return false;
  return true;
};

export const isDummySelfPreview = (item: PreviewItem) => item.optimistic && !item.edit;

const makeDummyPreview = (
  id: string,
  myId: string,
  channelId: string,
  inGame: boolean,
  edit: PreviewEdit | null,
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
  editFor: null,
  edit,
  optimistic: true,
  key: myId,
  timestamp: new Date().getTime(),
});

const SAFE_OFFSET = 2;
const HIDE_DUMMY_DELAY = 8000;

export const useShowDummy = (
  store: ReturnType<typeof useStore>,
  composeAtom: ChannelAtoms['composeAtom'],
  hideSelfPreviewTimeoutAtom: ChannelAtoms['hideSelfPreviewTimeoutAtom'],
): boolean => {
  const hideDummyTimeout = useRef<number>(0);
  const [showDummy, setShowDummy] = useState(false);
  useEffect(() => {
    let handle: number | undefined;
    const updateTimeout = () => {
      const now = Date.now();
      const timeout = hideDummyTimeout.current;
      if (now < timeout) {
        setShowDummy(true);
        clearTimeout(handle);
        handle = window.setTimeout(() => {
          setShowDummy(false);
        }, timeout - now);
      } else {
        setShowDummy(false);
      }
    };
    const unsubRecordModified = store.sub(composeAtom, () => {
      const focused = store.get(composeAtom).focused;
      if (focused) {
        hideDummyTimeout.current = Math.max(
          Date.now() + HIDE_DUMMY_DELAY,
          hideDummyTimeout.current,
        );
        updateTimeout();
      }
    });
    const unsubListenTimeout = store.sub(hideSelfPreviewTimeoutAtom, () => {
      const selfPreviewLock = store.get(hideSelfPreviewTimeoutAtom);
      hideDummyTimeout.current = Math.max(hideDummyTimeout.current, selfPreviewLock);
      updateTimeout();
    });
    return () => {
      unsubListenTimeout();
      unsubRecordModified();
      clearTimeout(handle);
    };
  }, [composeAtom, hideSelfPreviewTimeoutAtom, store]);
  return showDummy;
};

const useFilters = (
  filterAtom: ChannelAtoms['filterAtom'],
  showArchivedAtom: ChannelAtoms['showArchivedAtom'],
): {
  filterType: ChannelFilter;
  showArchived: boolean;
  isFiltersChanged: boolean;
} => {
  const filterType = useAtomValue(filterAtom);
  const showArchived = useAtomValue(showArchivedAtom);

  const filtersBefore = useRef<{ filterType: ChannelFilter; showArchived: boolean }>({
    filterType,
    showArchived,
  });
  const isFiltersChanged = useRef(false);
  if (
    filtersBefore.current.filterType !== filterType ||
    filtersBefore.current.showArchived !== showArchived
  ) {
    isFiltersChanged.current = true;
    filtersBefore.current = { filterType, showArchived };
  } else {
    isFiltersChanged.current = false;
  }

  return { filterType, showArchived, isFiltersChanged: isFiltersChanged.current };
};

type ChannelSlice = Pick<
  ChannelState,
  'messages' | 'fullLoaded' | 'previewMap' | 'optimisticMessageMap'
> & {
  scheduledGcLowerPos: number | null;
};

function channelSliceEq(a: ChannelSlice, b: ChannelSlice) {
  return (
    a.messages === b.messages &&
    a.fullLoaded === b.fullLoaded &&
    a.previewMap === b.previewMap &&
    a.optimisticMessageMap === b.optimisticMessageMap &&
    a.scheduledGcLowerPos === b.scheduledGcLowerPos
  );
}

export const useChatList = (channelId: string, myId?: string): UseChatListReturn => {
  const store = useStore();
  const { composeAtom, filterAtom, showArchivedAtom, parsedAtom, hideSelfPreviewTimeoutAtom } =
    useChannelAtoms();

  const { filterType, showArchived, isFiltersChanged } = useFilters(filterAtom, showArchivedAtom);

  // Compose state
  const composeSliceAtom = useMemo(
    () => selectAtom(composeAtom, selectComposeSlice, isComposeSliceEq),
    [composeAtom],
  );
  const composeSlice = useAtomValue(composeSliceAtom);
  const showDummy = useShowDummy(store, composeAtom, hideSelfPreviewTimeoutAtom);

  // Intentionally quit reactivity
  const isEmpty = store.get(parsedAtom).entities.length === 0;

  const channelSliceAtom = useMemo(
    () =>
      selectAtom(
        chatAtom,
        (chat): ChannelSlice => {
          const channel = chat.channels[channelId];
          if (!channel)
            return {
              messages: L.empty(),
              fullLoaded: false,
              previewMap: {},
              scheduledGcLowerPos: null,
              optimisticMessageMap: {},
            };
          return {
            messages: channel.messages,
            fullLoaded: channel.fullLoaded,
            previewMap: channel.previewMap,
            optimisticMessageMap: channel.optimisticMessageMap,
            scheduledGcLowerPos: channel.scheduledGc?.lowerPos ?? null,
          };
        },
        channelSliceEq,
      ),
    [channelId],
  );
  const { fullLoaded, messages, previewMap, scheduledGcLowerPos, optimisticMessageMap } =
    useAtomValue(channelSliceAtom);
  const firstItemIndex = useRef(START_INDEX); // can't be negative
  const { chatList, filteredMessagesCount } = useMemo((): Pick<
    UseChatListReturn,
    'chatList' | 'filteredMessagesCount'
  > => {
    if (!messages || !previewMap) return { chatList: [], filteredMessagesCount: 0 };
    const optimisticPreviewList = Object.values(previewMap);
    const optimisticMessageItems: OptimisticItem[] = [];
    for (const key in optimisticMessageMap) {
      const optimistic = optimisticMessageMap[key];
      if (optimistic?.ref.type === 'PREVIEW') {
        optimisticMessageItems.push(optimistic.item);
      }
    }
    const itemList: ChatItem[] = L.toArray(
      L.filter((item) => {
        const isFiltered = !filter(filterType, item);
        if (item.type === 'MESSAGE' && item.folded && !showArchived) return false;
        if (isFiltered) {
          return false;
        }
        const optimisticItem = optimisticMessageMap[item.id]?.item;
        if (
          !optimisticItem ||
          /* moved */ optimisticItem.item.pos !== item.pos ||
          /* just for type narrowing */ optimisticItem.item.type !== 'MESSAGE'
        ) {
          return true;
        }
        const itemTimestamp = Date.parse(item.modified);
        if (itemTimestamp >= optimisticItem.timestamp) {
          return true;
        } else {
          // Side effect: record the optimistic item that should be rendered.
          optimisticMessageItems.push(optimisticItem);
          return false;
        }
      }, messages),
    );
    const itemListLen = itemList.length;
    const filteredMessagesCount = messages.length - itemListLen;
    const minPos = itemListLen > 0 ? itemList[0]!.pos : Number.MIN_SAFE_INTEGER;
    if (myId) {
      const existsPreviewIndex = optimisticPreviewList.findIndex(
        (preview) => preview.senderId === myId,
      );
      let hasSelfPreview = existsPreviewIndex !== -1;
      if (hasSelfPreview) {
        const existsPreview = optimisticPreviewList[existsPreviewIndex]!;
        if (existsPreview.id !== composeSlice.previewId || isEmpty) {
          optimisticPreviewList.splice(existsPreviewIndex, 1);
          hasSelfPreview = false;
        }
      }
      if (!hasSelfPreview) {
        const maxPreviewPos = optimisticPreviewList.reduce(
          (max, preview) => Math.max(max, preview.pos),
          0,
        );
        const maxOptimisticPos = optimisticMessageItems.reduce(
          (max, { item }) => Math.max(max, item.pos),
          0,
        );
        const maxPos = Math.max(
          itemListLen > 0 ? itemList[itemListLen - 1]!.pos : 1,
          maxPreviewPos,
          maxOptimisticPos,
        );
        const dummyPos = Math.ceil(maxPos) + SAFE_OFFSET;
        let pos = dummyPos;
        let posP = pos;
        let posQ = 1;
        if (composeSlice.edit != null) {
          const editTargetPos = composeSlice.edit.p / composeSlice.edit.q;
          const result = findMessage(messages, composeSlice.previewId, editTargetPos);
          if (result) {
            const [message] = result;
            pos = message.pos;
            posP = message.posP;
            posQ = message.posQ;
          }
        }
        if (composeSlice.edit != null || showDummy) {
          optimisticPreviewList.push(
            makeDummyPreview(
              composeSlice.previewId,
              myId,
              channelId,
              true,
              composeSlice.edit,
              pos,
              posP,
              posQ,
            ),
          );
        }
      }
    }
    for (const preview of optimisticPreviewList) {
      const isFiltered = !filter(filterType, preview);
      if (isFiltered) continue;
      else if (preview.senderId === myId) {
        /* Always show the user's own preview */
      } else if (
        (preview.entities.length === 0 && preview.text != null) ||
        preview.id === composeSlice.prevPreviewId
      ) {
        continue;
      }
      if (preview.edit) {
        const findResult = findMessage(messages, preview.id, preview.pos);
        if (!findResult) {
          // The original message is not found
          continue;
        }
        const [message] = findResult;
        if (preview.edit.time !== message.modified) {
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
      }
      // Insert the preview to item list
      if (isDummySelfPreview(preview)) {
        itemList.push(preview);
      } else if (preview.text === '' && preview.senderId === myId) {
        itemList.push(preview);
      } else if (preview.pos > minPos || (preview.pos < minPos && fullLoaded)) {
        const index = binarySearchPos(itemList, preview.pos);
        const itemInThePosition = itemList[index];
        if (itemInThePosition?.pos === preview.pos && itemInThePosition.type !== 'PREVIEW') {
          // The position is already occupied by a message, skip.
          continue;
        }
        itemList.splice(index, 0, preview);
      }
    }
    for (const optimisticItem of optimisticMessageItems) {
      const { item, optimisticPos } = optimisticItem;
      const insertPos = binarySearchPos(itemList, optimisticPos);
      itemList.splice(insertPos, 0, item);
    }

    return { chatList: itemList, filteredMessagesCount };
  }, [
    channelId,
    composeSlice.edit,
    composeSlice.prevPreviewId,
    composeSlice.previewId,
    filterType,
    fullLoaded,
    isEmpty,
    messages,
    myId,
    optimisticMessageMap,
    previewMap,
    showArchived,
    showDummy,
  ]);

  // Show a warning when the user tries to leave the page
  useEffect(() => {
    if (!myId) return;
    const optimisticMessages = Object.values(optimisticMessageMap).filter(
      (message) => message.item.item.senderId === myId || message.ref.senderId === myId,
    );
    if (optimisticMessages.length === 0) return;
    const listener = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', listener);
    return () => {
      window.removeEventListener('beforeunload', listener);
    };
  }, [myId, optimisticMessageMap]);

  // Compute firstItemIndex for prepending items
  // https://virtuoso.dev/prepend-items/
  const prevChatListRef = useRef<ChatItem[] | null>(null);
  if (prevChatListRef.current != null) {
    const prevChatList = prevChatListRef.current;
    if (prevChatList.length > 0 && chatList.length > prevChatList.length && !isFiltersChanged) {
      const prevFirstItem = prevChatList[0]!;
      if (prevFirstItem.id !== chatList[0]!.id) {
        const prevFirstItemNewIndex = chatList.findIndex((item) => item.id === prevFirstItem.id);
        const prevFirstItemIndex = firstItemIndex.current;
        if (prevFirstItemNewIndex !== -1) {
          firstItemIndex.current = prevFirstItemIndex - prevFirstItemNewIndex;
        } else {
          recordWarn('Lost the previous first item', {
            chatListLength: chatList.length,
            prevChatListLength: prevChatList.length,
            prevFirstItem,
          });
          const lengthDiff = chatList.length - prevChatList.length;
          firstItemIndex.current = prevFirstItemIndex - lengthDiff;
        }
      }
    }
  }
  prevChatListRef.current = chatList;

  return {
    chatList,
    firstItemIndex: firstItemIndex.current,
    filteredMessagesCount,
    scheduledGcLowerPos,
  };
};
