import { atom, useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useEffect, useMemo } from 'react';
import { binarySearchPos } from '@boluo/sort';
import { findMessage, type OptimisticItem, type ChannelState } from '../state/channel.reducer';
import { type ChatItem, type MessageItem, type PreviewItem } from '../state/channel.types';
import { chatAtom } from '../state/chat.atoms';
import { type ComposeState } from '../state/compose.reducer';
import { type ChannelFilter, useChannelAtoms } from './useChannelAtoms';
import { type PreviewEdit } from '@boluo/api';
import * as L from 'list';

interface UseChatListReturn {
  chatList: ChatItem[];
  firstItemIndex: number;
  virtualListKey: string;
  filteredMessagesCount: number;
  scheduledGcLowerPos: number | null;
}

export const START_INDEX = 100000000;

export interface VirtualChatListState {
  chatList: ChatItem[];
  firstItemIndex: number;
  epoch: number;
  viewKey: string;
}

export const virtualChatItemKey = (item: ChatItem): string => `${item.type}:${item.key}`;

export const areChatListsReferentiallyEqual = (a: ChatItem[], b: ChatItem[]): boolean =>
  a === b || (a.length === b.length && a.every((item, index) => item === b[index]));

export const selectParsedIsEmpty = ({ entities }: { entities: readonly unknown[] }): boolean =>
  entities.length === 0;

const rebuildVirtualChatList = (
  previous: VirtualChatListState | undefined,
  chatList: ChatItem[],
  viewKey: string,
): VirtualChatListState => ({
  chatList,
  firstItemIndex: START_INDEX,
  epoch: previous == null ? 0 : previous.epoch + 1,
  viewKey,
});

/**
 * Reconcile Virtuoso's absolute first item index from two final, pane-local
 * projections. The channel reducer cannot do this because previews, filters,
 * archived messages, and optimistic moves are applied after reducer state.
 */
export const reconcileVirtualChatList = (
  previous: VirtualChatListState | undefined,
  chatList: ChatItem[],
  viewKey: string,
): VirtualChatListState => {
  if (previous == null) return rebuildVirtualChatList(undefined, chatList, viewKey);
  if (previous.viewKey !== viewKey) {
    return rebuildVirtualChatList(previous, chatList, viewKey);
  }

  const previousKeys = previous.chatList.map(virtualChatItemKey);
  const nextKeys = chatList.map(virtualChatItemKey);
  const previousKeySet = new Set(previousKeys);
  const nextKeySet = new Set(nextKeys);
  if (previousKeySet.size !== previousKeys.length || nextKeySet.size !== nextKeys.length) {
    return rebuildVirtualChatList(previous, chatList, viewKey);
  }

  const sameMembers =
    previousKeys.length === nextKeys.length && previousKeys.every((key) => nextKeySet.has(key));
  if (sameMembers) {
    // The rendered items only changed content or order. Neither operation is a
    // prepend/removal, even when an item crosses the previous list head.
    return {
      chatList,
      firstItemIndex: previous.firstItemIndex,
      epoch: previous.epoch,
      viewKey,
    };
  }

  const previousCommonKeys = previousKeys.filter((key) => nextKeySet.has(key));
  const nextCommonKeys = nextKeys.filter((key) => previousKeySet.has(key));
  if (
    previousCommonKeys.length === 0 ||
    previousCommonKeys.length !== nextCommonKeys.length ||
    previousCommonKeys.some((key, index) => key !== nextCommonKeys[index])
  ) {
    // With no stable item, or with reordering combined with membership
    // changes, there is no unambiguous prepend delta. Rebuild safely.
    return rebuildVirtualChatList(previous, chatList, viewKey);
  }

  const firstCommonKey = nextCommonKeys[0]!;
  const previousIndex = previousKeys.indexOf(firstCommonKey);
  const nextIndex = nextKeys.indexOf(firstCommonKey);
  const firstItemIndex = previous.firstItemIndex + previousIndex - nextIndex;
  if (firstItemIndex < 0) {
    return rebuildVirtualChatList(previous, chatList, viewKey);
  }
  return {
    chatList,
    firstItemIndex,
    epoch: previous.epoch,
    viewKey,
  };
};

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

export const isPreviewInLoadedRange = (
  previewPos: number,
  loadedMinPos: number,
  fullLoaded: boolean,
): boolean => previewPos > loadedMinPos || (previewPos < loadedMinPos && fullLoaded);

/**
 * Remove the self preview from the list when it is stale (id mismatch),
 * the compose is empty, or the self preview is hidden.
 *
 * Mutates `optimisticPreviewList`. Returns whether the self preview is kept.
 */
export const pruneSelfPreview = (
  optimisticPreviewList: PreviewItem[],
  myId: string,
  currentPreviewId: string,
  isEmpty: boolean,
  selfPreviewVisible: boolean,
): boolean => {
  const selfPreviewIndex = optimisticPreviewList.findIndex((preview) => preview.senderId === myId);
  if (selfPreviewIndex === -1) return false;
  const selfPreview = optimisticPreviewList[selfPreviewIndex]!;
  if (selfPreview.id !== currentPreviewId || isEmpty || !selfPreviewVisible) {
    optimisticPreviewList.splice(selfPreviewIndex, 1);
    return false;
  }
  return true;
};

/**
 * The edit preview follows the original message's current position, since
 * moving a message should not invalidate a content edit preview.
 *
 * Mutates `itemList`: replaces the original message with the preview in place.
 * Returns the preview when it still needs to be inserted, or null.
 */
export const applyEditPreview = (
  preview: PreviewItem,
  messages: L.List<MessageItem>,
  itemList: ChatItem[],
): PreviewItem | null => {
  if (preview.edit == null) return null;
  const findResult = findMessage(messages, preview.id, preview.pos);
  if (!findResult) {
    return null;
  }
  const [message] = findResult;
  if (preview.edit.time !== message.modified) {
    return null;
  }
  const resolved: PreviewItem = {
    ...preview,
    original: message,
    pos: message.pos,
    posP: message.posP,
    posQ: message.posQ,
  };
  const index = binarySearchPos(itemList, message.pos);
  if (message.id === itemList[index]?.id) {
    itemList[index] = resolved;
    return null;
  }
  // The original message may be filtered out; treat it as a normal preview.
  return resolved;
};

export const isMessageNewerThanOptimisticRef = (
  item: MessageItem,
  optimistic: OptimisticItem,
  ref: ChatItem,
): boolean => {
  if (ref.type !== 'MESSAGE' || optimistic.item.type !== 'MESSAGE') {
    return false;
  }
  const itemRev = item.rev ?? 0;
  const refRev = ref.rev ?? 0;
  if (itemRev !== refRev) {
    return itemRev > refRev;
  }
  return Date.parse(item.modified) > Date.parse(ref.modified);
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

const EMPTY_CHANNEL_SLICE: ChannelSlice = {
  messages: L.empty(),
  fullLoaded: false,
  previewMap: {},
  scheduledGcLowerPos: null,
  optimisticMessageMap: {},
};

interface ChatListProjectionInput extends ChannelSlice {
  channelId: string;
  myId?: string;
  composeSlice: ComposeSlice;
  filterType: ChannelFilter;
  showArchived: boolean;
  isEmpty: boolean;
  selfInGame: boolean;
  selfPreviewVisible: boolean;
}

interface ChatListProjection {
  chatList: ChatItem[];
  filteredMessagesCount: number;
}

const projectChatList = ({
  channelId,
  myId,
  composeSlice,
  filterType,
  showArchived,
  isEmpty,
  selfInGame,
  selfPreviewVisible,
  messages,
  fullLoaded,
  previewMap,
  optimisticMessageMap,
}: ChatListProjectionInput): ChatListProjection => {
  const optimisticPreviewList = Object.values(previewMap);
  const optimisticMessageItems: OptimisticItem[] = [];
  for (const key in optimisticMessageMap) {
    const optimistic = optimisticMessageMap[key];
    if (optimistic?.ref.type === 'PREVIEW') {
      optimisticMessageItems.push(optimistic.item);
    }
  }
  let filteredMessagesCount = 0;
  const itemList: ChatItem[] = L.toArray(
    L.filter((item) => {
      if (item.type === 'MESSAGE' && item.folded && !showArchived) {
        filteredMessagesCount++;
        return false;
      }
      if (!filter(filterType, item)) {
        filteredMessagesCount++;
        return false;
      }
      const optimisticMessage = optimisticMessageMap[item.id];
      const optimisticItem = optimisticMessage?.item;
      if (
        !optimisticItem ||
        /* moved */ optimisticItem.item.pos !== item.pos ||
        /* just for type narrowing */ optimisticItem.item.type !== 'MESSAGE'
      ) {
        return true;
      }
      if (isMessageNewerThanOptimisticRef(item, optimisticItem, optimisticMessage.ref)) {
        return true;
      }
      // Side effect: record the optimistic item that should be rendered.
      optimisticMessageItems.push(optimisticItem);
      return false;
    }, messages),
  );
  const itemListLen = itemList.length;
  const loadedMinPos = L.first(messages)?.pos ?? Number.MIN_SAFE_INTEGER;
  if (myId) {
    const hasSelfPreview = pruneSelfPreview(
      optimisticPreviewList,
      myId,
      composeSlice.previewId,
      isEmpty,
      selfPreviewVisible,
    );
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
      if (selfPreviewVisible) {
        optimisticPreviewList.push(
          makeDummyPreview(
            composeSlice.previewId,
            myId,
            channelId,
            selfInGame,
            composeSlice.edit,
            pos,
            posP,
            posQ,
          ),
        );
      }
    }
  }
  for (let preview of optimisticPreviewList) {
    if (preview.senderId === myId && !selfPreviewVisible) {
      continue;
    }
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
      const resolved = applyEditPreview(preview, messages, itemList);
      if (resolved == null) continue;
      preview = resolved;
    }
    // Insert the preview to item list
    if (isDummySelfPreview(preview)) {
      itemList.push(preview);
    } else if (preview.text === '' && preview.senderId === myId) {
      itemList.push(preview);
    } else if (isPreviewInLoadedRange(preview.pos, loadedMinPos, fullLoaded)) {
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
};

interface ChatListViewState extends VirtualChatListState {
  filteredMessagesCount: number;
  scheduledGcLowerPos: number | null;
  optimisticMessageMap: ChannelState['optimisticMessageMap'];
}

export const useChatList = (channelId: string, myId?: string): UseChatListReturn => {
  const {
    composeAtom,
    filterAtom,
    showArchivedAtom,
    parsedAtom,
    selfPreviewVisibleAtom,
    inGameAtom,
  } = useChannelAtoms();

  const composeSliceAtom = useMemo(
    () => selectAtom(composeAtom, selectComposeSlice, isComposeSliceEq),
    [composeAtom],
  );
  const parsedIsEmptyAtom = useMemo(
    () => selectAtom(parsedAtom, selectParsedIsEmpty),
    [parsedAtom],
  );
  const channelSliceAtom = useMemo(
    () =>
      selectAtom(
        chatAtom,
        (chat): ChannelSlice => {
          const channel = chat.channels[channelId];
          if (!channel) return EMPTY_CHANNEL_SLICE;
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
  const chatListSourceAtom = useMemo(
    () =>
      atom((get): ChatListProjectionInput => {
        return {
          ...get(channelSliceAtom),
          channelId,
          myId,
          composeSlice: get(composeSliceAtom),
          filterType: get(filterAtom),
          showArchived: get(showArchivedAtom),
          isEmpty: get(parsedIsEmptyAtom),
          selfInGame: get(inGameAtom),
          selfPreviewVisible: get(selfPreviewVisibleAtom),
        };
      }),
    [
      channelId,
      channelSliceAtom,
      composeSliceAtom,
      filterAtom,
      inGameAtom,
      myId,
      parsedIsEmptyAtom,
      selfPreviewVisibleAtom,
      showArchivedAtom,
    ],
  );
  const chatListViewAtom = useMemo(
    () =>
      selectAtom(chatListSourceAtom, (source, previous: ChatListViewState | undefined) => {
        const projection = projectChatList(source);
        const viewKey = `${source.filterType}:${source.showArchived ? 'ARCHIVED' : 'VISIBLE'}`;
        if (
          previous != null &&
          previous.viewKey === viewKey &&
          areChatListsReferentiallyEqual(previous.chatList, projection.chatList)
        ) {
          if (
            previous.filteredMessagesCount === projection.filteredMessagesCount &&
            previous.scheduledGcLowerPos === source.scheduledGcLowerPos &&
            previous.optimisticMessageMap === source.optimisticMessageMap
          ) {
            return previous;
          }
          return {
            ...previous,
            filteredMessagesCount: projection.filteredMessagesCount,
            scheduledGcLowerPos: source.scheduledGcLowerPos,
            optimisticMessageMap: source.optimisticMessageMap,
          };
        }
        const virtualState = reconcileVirtualChatList(previous, projection.chatList, viewKey);
        return {
          ...virtualState,
          filteredMessagesCount: projection.filteredMessagesCount,
          scheduledGcLowerPos: source.scheduledGcLowerPos,
          optimisticMessageMap: source.optimisticMessageMap,
        };
      }),
    [chatListSourceAtom],
  );
  const {
    chatList,
    firstItemIndex,
    epoch,
    filteredMessagesCount,
    scheduledGcLowerPos,
    optimisticMessageMap,
  } = useAtomValue(chatListViewAtom);

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

  return {
    chatList,
    firstItemIndex,
    virtualListKey: `${channelId}:${myId ?? 'ANONYMOUS'}:${epoch}`,
    filteredMessagesCount,
    scheduledGcLowerPos,
  };
};
