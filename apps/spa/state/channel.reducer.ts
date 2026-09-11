import type { EditMessage, NewMessage, Preview } from '@boluo/api';
import {
  equalPreviewEdit,
  isClearedPreviewContent,
  resolvePreviewDiff,
  toPreviewDiffBase,
} from '@boluo/api/preview/diff';
import { binarySearchPosList } from '@boluo/sort';
import { parse } from '@boluo/interpreter';
import { type MessageItem, type PreviewItem } from './channel.types';
import { type ChatAction, type ChatActionUnion } from './chat.actions';
import type { ChatReducerContext } from './chat.reducer';
import { recordWarn } from '../error';
import { MessageStore, type MessageStoreError } from './message-store';
import { type Result } from '@boluo/utils/result';
import * as L from 'list';
import { type ComposeState } from './compose.reducer';
import { toMessageItem } from './message';

export type UserId = string;

type PreviewActivityKey = Exclude<
  keyof Preview,
  'v' | 'senderId' | 'channelId' | 'parentMessageId' | 'isMaster' | 'entities' | 'pos'
>;

const equalOptionalStrings = (
  left: string[] | null | undefined,
  right: string[] | null | undefined,
): boolean => {
  if (left == null || right == null) return left == null && right == null;
  return left.length === right.length && left.every((value, index) => value === right[index]);
};

const hasSamePreviewActivity = (previous: PreviewItem, next: Preview): boolean =>
  Object.values({
    id: previous.id === next.id,
    name: previous.name === next.name,
    mediaId: (previous.mediaId ?? null) === (next.mediaId ?? null),
    inGame: (previous.inGame ?? false) === (next.inGame ?? false),
    isAction: (previous.isAction ?? false) === (next.isAction ?? false),
    clear: (previous.clear ?? false) === (next.clear ?? false),
    text: (previous.text ?? null) === (next.text ?? null),
    whisperToUsers: equalOptionalStrings(previous.whisperToUsers, next.whisperToUsers),
    editFor: (previous.editFor ?? null) === (next.editFor ?? null),
    edit: equalPreviewEdit(previous.edit, next.edit),
  } satisfies Record<PreviewActivityKey, boolean>).every(Boolean);

const GC_TRIGGER_LENGTH = 128;
const GC_INITIAL_COUNTDOWN = 8;
const MIN_START_GC_COUNT = 4;

export interface OptimisticItem {
  optimisticPos: number;
  timestamp: number;
  item: MessageItem | PreviewItem;
  composeState?: ComposeState;
}

export interface OptimisticMessage {
  ref: PreviewItem | MessageItem;
  item: OptimisticItem;
}

const removePreviewBySender = (
  previewMap: Record<UserId, PreviewItem>,
  senderId: UserId,
): Record<UserId, PreviewItem> => {
  if (previewMap[senderId] == null) return previewMap;
  const nextPreviewMap = { ...previewMap };
  delete nextPreviewMap[senderId];
  return nextPreviewMap;
};

const editMessageOptimisticItem = (
  { text, entities = [], isAction, mediaId }: EditMessage,
  speaker: ChatAction<'messageEditing'>['payload']['speaker'],
  previousMessage: MessageItem,
  sendTime: number,
  media: File | null,
  composeState?: ComposeState,
): OptimisticMessage => {
  const message: MessageItem = {
    ...previousMessage,
    optimistic: true,
    optimisticMedia: media,
    name: speaker.name,
    characterId: speaker.characterId,
    portraitId: speaker.portraitId,
    text,
    entities,
    inGame: speaker.inGame,
    isAction,
    mediaId,
    color: speaker.color,
  };
  const item: OptimisticItem = {
    optimisticPos: previousMessage.pos,
    timestamp: sendTime,
    item: message,
    composeState,
  };
  return { ref: previousMessage, item };
};

const newMessageOptimisticItem = (
  newMessage: NewMessage,
  preview: PreviewItem,
  sendTime: number,
  media: File | null,
  composeState?: ComposeState,
): OptimisticMessage => {
  const created = new Date(sendTime).toISOString();
  const id = newMessage.previewId ?? preview.id;
  const message: MessageItem = {
    key: id,
    optimistic: true,
    optimisticMedia: media,
    id,
    type: 'MESSAGE',
    pos: preview.pos,
    posP: preview.posP,
    posQ: preview.posQ,
    channelId: newMessage.channelId,
    senderId: preview.senderId,
    parentMessageId: preview.parentMessageId,
    name: newMessage.name,
    characterId: newMessage.characterId,
    portraitId: newMessage.portraitId,
    mediaId: newMessage.mediaId,
    inGame: newMessage.inGame,
    seed: [],
    isAction: newMessage.isAction,
    isMaster: preview.isMaster,
    pinned: false,
    color: newMessage.color ?? '',
    text: newMessage.text,
    folded: false,
    modified: created,
    entities: newMessage.entities ?? [],
    whisperToUsers: newMessage.whisperToUsers,
    created,
    tags: [],
  };
  const item: OptimisticItem = {
    optimisticPos: preview.pos,
    timestamp: sendTime,
    item: message,
    composeState,
  };
  return { ref: preview, item };
};

export type ChannelHistoryState = 'UNINITIALIZED' | 'INITIAL_LOADING' | 'PARTIAL' | 'FULL';

export interface ChannelState {
  id: string;
  historyState: ChannelHistoryState;
  historyMutationGeneration: number;
  pendingMessageMutations: MessageMutationAction[];
  messages: MessageStore;
  previewMap: Record<UserId, PreviewItem>;
  optimisticMessageMap: Record<string, OptimisticMessage>;
  scheduledGc: ScheduledGc | null;
  collidedPreviewIdSet: Set<string>;
}

export const isChannelHistoryInitialized = (state: ChannelState): boolean =>
  state.historyState === 'PARTIAL' || state.historyState === 'FULL';

export const isChannelHistoryFull = (state: Pick<ChannelState, 'historyState'>): boolean =>
  state.historyState === 'FULL';

export interface OlderMessagesPageRequest {
  before: number;
  historyMutationGeneration: number;
}

export const isOlderMessagesPageCurrent = (
  state: ChannelState | undefined,
  request: OlderMessagesPageRequest,
): boolean =>
  state?.historyState === 'PARTIAL' &&
  L.first(state.messages.ordered)?.pos === request.before &&
  state.historyMutationGeneration === request.historyMutationGeneration;

const messageDiagnostic = (message: Pick<MessageItem, 'id' | 'modified' | 'pos' | 'rev'>) => ({
  id: message.id,
  modified: message.modified,
  pos: message.pos,
  rev: message.rev,
});

const channelLogContext = (state: ChannelState, action: ChatActionUnion) => ({
  actionType: action.type,
  channelId: state.id,
  firstPos: L.first(state.messages.ordered)?.pos,
  historyMutationGeneration: state.historyMutationGeneration,
  historyState: state.historyState,
  lastPos: L.last(state.messages.ordered)?.pos,
  messageCount: state.messages.length,
  pendingMessageMutationCount: state.pendingMessageMutations.length,
});

type MessageMutationAction = ChatAction<'messageEdited'> | ChatAction<'messageDeleted'>;

export interface ScheduledGc {
  countdown: number;
  /** Messages with pos < lower will be deleted */
  lowerPos: number;
}

export const makeInitialChannelState = (id: string): ChannelState => {
  return {
    id,
    messages: MessageStore.empty(),
    historyState: 'UNINITIALIZED',
    historyMutationGeneration: 0,
    pendingMessageMutations: [],
    previewMap: {},
    scheduledGc: null,
    collidedPreviewIdSet: new Set(),
    optimisticMessageMap: {},
  };
};

const invalidateMessageHistory = (state: ChannelState): ChannelState => ({
  ...state,
  historyState: 'UNINITIALIZED',
  messages: MessageStore.empty(),
  scheduledGc: null,
});

const applyMessageStore = (
  state: ChannelState,
  result: Result<MessageStore, MessageStoreError>,
  warning = 'Invalid message store update',
): ChannelState => {
  if (result.isErr) {
    recordWarn(warning, { error: result.err }, { context: { channelId: state.id } });
    return invalidateMessageHistory(state);
  }
  return { ...state, messages: result.some };
};

const filterPreviewMap = (
  previewId: string | null | undefined,
  previewMap: Record<UserId, PreviewItem>,
): Record<UserId, PreviewItem> => {
  if (!previewId) return previewMap;
  const previews = Object.values(previewMap);
  if (!previews.find((preview) => preview.id === previewId)) return previewMap;
  return Object.fromEntries(
    previews
      .filter((preview) => preview.id !== previewId)
      .map((preview) => [preview.senderId, preview]),
  );
};

const filterOptimisticMessages = (
  refId: string | null | undefined,
  optimisticMessageMap: Record<string, OptimisticMessage>,
): Record<string, OptimisticMessage> => {
  if (!refId) return optimisticMessageMap;
  if (refId in optimisticMessageMap) {
    const nextOptimisticMessages = { ...optimisticMessageMap };
    delete nextOptimisticMessages[refId];
    return nextOptimisticMessages;
  }
  return optimisticMessageMap;
};

const handleNewMessage = (
  state: ChannelState,
  action: ChatAction<'receiveMessage'>,
): ChannelState => {
  const { payload } = action;
  const { messages } = state;
  const message = toMessageItem(payload.message);
  const previewMap = filterPreviewMap(payload.previewId, state.previewMap);
  const optimisticMessageMap = filterOptimisticMessages(
    payload.previewId,
    state.optimisticMessageMap,
  );

  // A replayed creation event may use an old position, so check the version by ID first.
  const currentMessage = messages.get(message.id);
  if (currentMessage && compareMessageVersion(currentMessage, message) >= 0) {
    return { ...state, previewMap, optimisticMessageMap };
  }

  if (currentMessage) {
    return handleMessageEdited(
      {
        ...state,
        previewMap,
        optimisticMessageMap,
        historyMutationGeneration: state.historyMutationGeneration + 1,
      },
      {
        type: 'messageEdited',
        payload: { channelId: state.id, message, oldPos: currentMessage.pos },
      },
    );
  }

  const nextState = { ...state, previewMap, optimisticMessageMap };
  const topMessage = L.first(messages.ordered);
  if (topMessage && message.pos < topMessage.pos && !isChannelHistoryFull(state)) {
    return nextState;
  }
  // Keep messages received before history loads: its snapshot may predate this event.
  const result = messages.insert(message);
  if (result.isErr && result.err.type === 'POSITION_COLLISION') {
    const [conflictingMessage, insertIndex] = messages.find(result.err.conflictingId)!;
    const atBoundary = insertIndex === 0 || insertIndex === messages.length - 1;
    recordWarn(
      atBoundary ? 'Unexpected new message at history boundary' : 'Unexpected new message position',
      {
        conflictingMessage: messageDiagnostic(conflictingMessage),
        incomingMessage: messageDiagnostic(message),
        ...(!atBoundary && { insertIndex }),
      },
      { context: channelLogContext(state, action) },
    );
    return invalidateMessageHistory(nextState);
  }
  return applyMessageStore(nextState, result);
};

const mergeHistoryPage = (
  state: ChannelState,
  payload: Pick<ChatAction<'initialHistoryLoaded'>['payload'], 'messages' | 'historyExhausted'>,
): ChannelState => {
  if (isChannelHistoryFull(state)) return state;
  const topMessage = L.first(state.messages.ordered);
  const historyState: ChannelHistoryState = payload.historyExhausted ? 'FULL' : 'PARTIAL';
  const nextState = historyState === state.historyState ? state : { ...state, historyState };
  if (payload.messages.length === 0) return nextState;

  // History arrives in descending order. Only merge messages below the loaded window.
  const payloadMessages = L.from(payload.messages);
  const olderMessages = topMessage
    ? L.dropWhile((message) => message.pos >= topMessage.pos, payloadMessages)
    : payloadMessages;
  if (olderMessages.length === 0) return nextState;
  const page = MessageStore.fromSorted(L.reverse(L.map(toMessageItem, olderMessages)));
  const merged = topMessage
    ? page.andThen((messages) => state.messages.prependOlder(messages))
    : page;
  return applyMessageStore(nextState, merged, 'Invalid message history page');
};

const handleInitialHistoryLoaded = (
  state: ChannelState,
  { payload }: ChatAction<'initialHistoryLoaded'>,
): ChannelState => {
  const historyWasInitialized = isChannelHistoryInitialized(state);
  const nextState = mergeHistoryPage(state, payload);
  if (historyWasInitialized || !isChannelHistoryInitialized(nextState)) return nextState;
  return replayPendingMessageMutations(nextState);
};

const handleOlderMessagesLoaded = (
  state: ChannelState,
  { payload }: ChatAction<'olderMessagesLoaded'>,
): ChannelState => {
  if (!isOlderMessagesPageCurrent(state, payload)) {
    return state;
  }
  return mergeHistoryPage(state, payload);
};

const handleInitialHistoryLoadStarted = (state: ChannelState): ChannelState => {
  if (state.historyState !== 'UNINITIALIZED') return state;
  return { ...state, historyState: 'INITIAL_LOADING' };
};

const handleInitialHistoryLoadFailed = (state: ChannelState): ChannelState => {
  if (state.historyState !== 'INITIAL_LOADING') return state;
  return {
    ...state,
    historyState: 'UNINITIALIZED',
    pendingMessageMutations: [],
  };
};

const handleMessageSending = (
  state: ChannelState,
  { payload: { newMessage, sendTime, media, composeState } }: ChatAction<'messageSending'>,
): ChannelState => {
  if (!newMessage.previewId) return state;
  const preview = Object.values(state.previewMap).find(
    (preview) => preview.id === newMessage.previewId,
  );
  if (!preview) return state;
  const optimisticItem = newMessageOptimisticItem(
    newMessage,
    preview,
    sendTime,
    media,
    composeState,
  );
  return {
    ...state,
    optimisticMessageMap: { ...state.optimisticMessageMap, [newMessage.previewId]: optimisticItem },
  };
};

const handleMessageEditing = (
  state: ChannelState,
  {
    payload: { editMessage, speaker, sendTime, media, composeState },
  }: ChatAction<'messageEditing'>,
): ChannelState => {
  const previousMessage = state.messages.get(editMessage.messageId);
  if (!previousMessage) return state;
  const optimisticItem = editMessageOptimisticItem(
    editMessage,
    speaker,
    previousMessage,
    sendTime,
    media,
    composeState,
  );
  return {
    ...state,
    optimisticMessageMap: {
      ...state.optimisticMessageMap,
      [editMessage.messageId]: optimisticItem,
    },
  };
};

const compareMessageModified = (a: MessageItem, b: MessageItem): number => {
  const aModified = Date.parse(a.modified);
  const bModified = Date.parse(b.modified);
  return aModified - bModified;
};

const messageRev = (message: MessageItem): number => message.rev ?? 0;

const compareMessageVersion = (a: MessageItem, b: MessageItem): number => {
  const revDiff = messageRev(a) - messageRev(b);
  if (revDiff !== 0) return revDiff;
  return compareMessageModified(a, b);
};

const reconcileOptimisticMessageEdited = (
  optimisticMessageMap: Record<string, OptimisticMessage>,
  message: MessageItem,
): Record<string, OptimisticMessage> => {
  const optimisticMessage = optimisticMessageMap[message.id];
  if (
    !optimisticMessage ||
    optimisticMessage.ref.type !== 'MESSAGE' ||
    optimisticMessage.item.item.type !== 'MESSAGE'
  ) {
    return filterOptimisticMessages(message.id, optimisticMessageMap);
  }

  if (compareMessageModified(message, optimisticMessage.ref) > 0) {
    return filterOptimisticMessages(message.id, optimisticMessageMap);
  }

  const optimisticItem = optimisticMessage.item.item;
  const nextOptimisticItem: MessageItem = {
    ...message,
    optimistic: optimisticItem.optimistic,
    optimisticMedia: optimisticItem.optimisticMedia,
    failTo: optimisticItem.failTo,
    key: optimisticItem.key,
    name: optimisticItem.name,
    text: optimisticItem.text,
    entities: optimisticItem.entities,
    inGame: optimisticItem.inGame,
    isAction: optimisticItem.isAction,
    mediaId: optimisticItem.mediaId,
    color: optimisticItem.color,
  };

  return {
    ...optimisticMessageMap,
    [message.id]: {
      ref: message,
      item: {
        ...optimisticMessage.item,
        optimisticPos: message.pos,
        item: nextOptimisticItem,
      },
    },
  };
};

/**
 * Keep edit previews pointing at the original message's current position
 * when the message is moved without changing its content edit timestamp.
 */
const syncEditPreviewsWithMessage = (
  previewMap: Record<UserId, PreviewItem>,
  message: MessageItem,
): Record<UserId, PreviewItem> => {
  let nextPreviewMap: Record<UserId, PreviewItem> | null = null;
  for (const senderId in previewMap) {
    const preview = previewMap[senderId];
    if (
      preview?.edit == null ||
      preview.id !== message.id ||
      preview.pos === message.pos ||
      preview.edit.time !== message.modified
    ) {
      continue;
    }
    nextPreviewMap ??= { ...previewMap };
    nextPreviewMap[senderId] = {
      ...preview,
      pos: message.pos,
      posP: message.posP,
      posQ: message.posQ,
    };
  }
  return nextPreviewMap ?? previewMap;
};

const handleMessageEdited = (
  state: ChannelState,
  action: ChatAction<'messageEdited'>,
): ChannelState => {
  const { payload } = action;
  const message: MessageItem = toMessageItem(payload.message);
  const optimisticMessageMap = reconcileOptimisticMessageEdited(
    state.optimisticMessageMap,
    message,
  );
  const previewMap = syncEditPreviewsWithMessage(state.previewMap, message);
  const originalTopMessage = L.head(state.messages.ordered);
  if (!originalTopMessage) {
    return { ...state, optimisticMessageMap };
  }
  const { messages } = state;
  // The event's oldPos may be stale; use the loaded message's identity instead.
  const item = messages.get(message.id);
  if (item != null) {
    const versionDiff = compareMessageVersion(item, message);
    if (
      versionDiff > 0 ||
      (versionDiff === 0 &&
        item.pos === message.pos &&
        /* Show a whisper message */
        message.text === item.text)
    ) {
      return state;
    }
  }
  const nextState = { ...state, optimisticMessageMap, previewMap };
  // With partial history, keep a moved message only if it is at or after the
  // oldest remaining message. If none remain, compare against its original position.
  const topMessage =
    item === originalTopMessage && item.pos !== message.pos
      ? (L.nth(1, messages.ordered) ?? originalTopMessage)
      : originalTopMessage;
  if (message.pos < topMessage.pos && !isChannelHistoryFull(state)) {
    return { ...nextState, messages: messages.remove(message.id) };
  }
  const result = messages.merge(message);
  if (result.isErr && result.err.type === 'POSITION_COLLISION') {
    const [conflictingMessage, conflictingIndex] = messages.find(result.err.conflictingId)!;
    const insertIndex = conflictingIndex - (item && item.pos < message.pos ? 1 : 0);
    recordWarn(
      'Unexpected message position in editing',
      {
        conflictingMessage: messageDiagnostic(conflictingMessage),
        incomingMessage: messageDiagnostic(message),
        insertIndex,
        oldPos: payload.oldPos,
      },
      { context: channelLogContext(state, action) },
    );
    return invalidateMessageHistory(nextState);
  }
  return applyMessageStore(nextState, result);
};

const handleMessagePreview = (
  state: ChannelState,
  { payload: { preview, timestamp } }: ChatAction<'messagePreview'>,
): ChannelState => {
  let newItem: PreviewItem;
  let { previewMap, collidedPreviewIdSet } = state;
  const previousPreview = previewMap[preview.senderId];
  const activityTimestamp =
    previousPreview != null && hasSamePreviewActivity(previousPreview, preview)
      ? previousPreview.timestamp
      : timestamp;
  if (isClearedPreviewContent(preview)) {
    previewMap = removePreviewBySender(previewMap, preview.senderId);
    if (collidedPreviewIdSet.has(preview.id)) {
      collidedPreviewIdSet = new Set(collidedPreviewIdSet);
      collidedPreviewIdSet.delete(preview.id);
    }
    return { ...state, previewMap, collidedPreviewIdSet };
  }
  if (preview.edit != null) {
    const pos = preview.edit.p / preview.edit.q;
    // An edit preview can arrive after its target message has moved.
    const message = state.messages.get(preview.id);
    if (message == null) {
      newItem = {
        ...preview,
        type: 'PREVIEW',
        pos,
        posP: preview.edit.p,
        posQ: preview.edit.q,
        key: preview.senderId,
        timestamp: activityTimestamp,
        keyframe: toPreviewDiffBase(preview),
      };
    } else {
      if (message.modified !== preview.edit.time || message.senderId !== preview.senderId) {
        return state;
      }
      newItem = {
        ...preview,
        type: 'PREVIEW',
        pos: message.pos,
        posP: message.posP,
        posQ: message.posQ,
        key: preview.senderId,
        timestamp: activityTimestamp,
        keyframe: toPreviewDiffBase(preview),
      };
    }
  } else {
    // The `preview.pos` is supposed to be integer, just `ceil` it to be safe.
    const pos = Math.ceil(preview.pos);
    const posP = pos;
    const posQ = 1;
    const [, itemByPos] = binarySearchPosList(state.messages.ordered, pos);
    if (itemByPos) {
      collidedPreviewIdSet = new Set([...collidedPreviewIdSet, preview.id]);
    }
    newItem = {
      ...preview,
      type: 'PREVIEW',
      posQ,
      posP,
      pos,
      key: preview.senderId,
      timestamp: activityTimestamp,
      keyframe: toPreviewDiffBase(preview),
    };
  }

  previewMap = { ...previewMap, [preview.senderId]: newItem };
  return { ...state, previewMap, collidedPreviewIdSet };
};

const handleMessagePreviewDiff = (
  state: ChannelState,
  { payload: { diff, timestamp } }: ChatAction<'messagePreviewDiff'>,
): ChannelState => {
  const preview = state.previewMap[diff.sender];
  if (!preview) return state;
  const keyframe = preview.keyframe ?? toPreviewDiffBase(preview);
  const result = resolvePreviewDiff({
    keyframe,
    // `preview.v` holds the last applied version (keyframe or diff); sender shares a
    // single counter so diff.v is always > the keyframe.v it was built on.
    currentVersion: preview.v ?? keyframe.version,
    diff: diff._,
    parseEntities: (text) => parse(text).entities,
    onParseError: (error, text) => {
      recordWarn('Failed to parse preview diff text', { text, error });
    },
  });
  if (result == null) {
    return state;
  }
  const { text, name, entities, version } = result;
  const nextPreview: PreviewItem = {
    ...preview,
    name,
    text,
    entities,
    v: version,
    timestamp,
    keyframe,
  };
  return {
    ...state,
    previewMap: { ...state.previewMap, [diff.sender]: nextPreview },
  };
};

const handleMessageDeleted = (
  state: ChannelState,
  { payload: { messageId, pos } }: ChatAction<'messageDeleted'>,
  { warnOnStalePos = true }: { warnOnStalePos?: boolean } = {},
): ChannelState => {
  let optimisticMessageMap: typeof state.optimisticMessageMap;
  if (messageId in state.optimisticMessageMap) {
    optimisticMessageMap = { ...state.optimisticMessageMap };
    delete optimisticMessageMap[messageId];
  } else {
    optimisticMessageMap = state.optimisticMessageMap;
  }
  if (warnOnStalePos) {
    const message = state.messages.get(messageId);
    if (message && pos != null && message.pos !== pos) {
      const [index] = binarySearchPosList(state.messages.ordered, message.pos);
      const [foundIndex, foundItem] = binarySearchPosList(state.messages.ordered, pos);
      recordWarn('Found message by id but failed to find by pos', {
        id: messageId,
        pos,
        index,
        foundIndex,
        foundItemId: foundItem?.id,
        messagePos: message.pos,
      });
    }
  }
  const messages = state.messages.remove(messageId);
  return {
    ...state,
    optimisticMessageMap,
    messages,
  };
};

const applyMessageMutation = (
  state: ChannelState,
  action: MessageMutationAction,
  { warnOnStaleDeletePos = true }: { warnOnStaleDeletePos?: boolean } = {},
): ChannelState =>
  action.type === 'messageEdited'
    ? handleMessageEdited(state, action)
    : handleMessageDeleted(state, action, { warnOnStalePos: warnOnStaleDeletePos });

const bufferMessageMutation = (
  state: ChannelState,
  action: MessageMutationAction,
): ChannelState => {
  const pendingState = {
    ...state,
    pendingMessageMutations: [...state.pendingMessageMutations, action],
  };
  if (action.type === 'messageDeleted') {
    return applyMessageMutation(pendingState, action, {
      warnOnStaleDeletePos: false,
    });
  }
  const hasLoadedMessage = state.messages.has(action.payload.message.id);
  return hasLoadedMessage ? applyMessageMutation(pendingState, action) : pendingState;
};

const replayPendingMessageMutations = (state: ChannelState): ChannelState => {
  const { pendingMessageMutations } = state;
  if (pendingMessageMutations.length === 0) return state;

  let nextState: ChannelState = { ...state, pendingMessageMutations: [] };
  for (const [index, action] of pendingMessageMutations.entries()) {
    nextState = applyMessageMutation(nextState, action, {
      warnOnStaleDeletePos: false,
    });
    if (!isChannelHistoryInitialized(nextState)) {
      return {
        ...nextState,
        // The mutation that reset history was not applied; retry it after the next snapshot.
        pendingMessageMutations: pendingMessageMutations.slice(index),
      };
    }
  }
  return nextState;
};

const handleResetGc = (
  state: ChannelState,
  { payload: { pos } }: ChatAction<'resetGc'>,
): ChannelState => {
  if (state.scheduledGc == null) return state;
  const { lowerPos } = state.scheduledGc;
  if (pos >= lowerPos) return state;
  return { ...state, scheduledGc: { countdown: GC_INITIAL_COUNTDOWN, lowerPos: pos } };
};

const handleSetOptimisticMessage = (
  state: ChannelState,
  { payload }: ChatAction<'setOptimisticMessage'>,
): ChannelState => {
  return {
    ...state,
    optimisticMessageMap: { ...state.optimisticMessageMap, [payload.ref.id]: payload },
  };
};

const handleRemoveOptimisticMessage = (
  state: ChannelState,
  { payload: { id, timestamp } }: ChatAction<'removeOptimisticMessage'>,
): ChannelState => {
  if (timestamp != null && state.optimisticMessageMap[id]?.item.timestamp !== timestamp) {
    return state;
  }
  const optimisticMessageMap = { ...state.optimisticMessageMap };
  delete optimisticMessageMap[id];
  return { ...state, optimisticMessageMap };
};

const handleFail = (state: ChannelState, { payload }: ChatAction<'fail'>): ChannelState => {
  const { failTo, key, timestamp, baseRev, basePos } = payload;
  if (failTo.type === 'SEND') {
    const optimisticMessage = state.optimisticMessageMap[key];
    if (!optimisticMessage) return state;
    const chatItem = optimisticMessage.item.item;
    if (chatItem.type !== 'MESSAGE') return state;
    const item: MessageItem = { ...chatItem, failTo };
    const optimisticItem: OptimisticItem = { ...optimisticMessage.item, item };
    const optimisticMessageMap: ChannelState['optimisticMessageMap'] = {
      ...state.optimisticMessageMap,
      [optimisticMessage.ref.id]: { ...optimisticMessage, item: optimisticItem },
    };
    return { ...state, optimisticMessageMap };
  }
  if (failTo.type === 'EDIT') {
    return handleRemoveOptimisticMessage(state, {
      type: 'removeOptimisticMessage',
      payload: { id: key, timestamp },
    });
  }
  const message = state.messages.get(key);
  let messages = state.messages;
  if (message) {
    const [basePosP, basePosQ] = basePos ?? [message.posP, message.posQ];
    const movedFromBasePos = message.posP !== basePosP || message.posQ !== basePosQ;
    if (
      failTo.type === 'MOVE' &&
      baseRev != null &&
      messageRev(message) > baseRev &&
      movedFromBasePos
    ) {
      return handleRemoveOptimisticMessage(state, {
        type: 'removeOptimisticMessage',
        payload: { id: key },
      });
    }
    messages = state.messages.update({ ...message, failTo });
  }

  return handleRemoveOptimisticMessage(
    { ...state, messages },
    { type: 'removeOptimisticMessage', payload: { id: key } },
  );
};

const channelReducer$ = (
  state: ChannelState,
  action: ChatActionUnion,
  initialized: boolean,
): ChannelState => {
  switch (action.type) {
    case 'messagePreview':
      return handleMessagePreview(state, action);
    case 'messagePreviewDiff':
      return handleMessagePreviewDiff(state, action);
    case 'receiveMessage':
      return handleNewMessage(state, action);
    case 'messageEdited':
    case 'messageDeleted': {
      const nextState =
        state.historyState === 'INITIAL_LOADING'
          ? bufferMessageMutation(state, action)
          : applyMessageMutation(state, action);
      return {
        ...nextState,
        historyMutationGeneration: state.historyMutationGeneration + 1,
      };
    }
    case 'messageSending':
      return handleMessageSending(state, action);
    case 'messageEditing':
      return handleMessageEditing(state, action);
    case 'setOptimisticMessage':
      return handleSetOptimisticMessage(state, action);
    case 'removeOptimisticMessage':
      return handleRemoveOptimisticMessage(state, action);
    case 'initialHistoryLoaded':
      // This action is triggered by the user
      // and should be ignored if the chat state
      // has not been initialized.
      return initialized ? handleInitialHistoryLoaded(state, action) : state;
    case 'olderMessagesLoaded':
      return initialized ? handleOlderMessagesLoaded(state, action) : state;
    case 'initialHistoryLoadStarted':
      return initialized ? handleInitialHistoryLoadStarted(state) : state;
    case 'initialHistoryLoadFailed':
      return handleInitialHistoryLoadFailed(state);
    case 'fail':
      return handleFail(state, action);
    case 'resetGc':
      return handleResetGc(state, action);
    default:
      return state;
  }
};

const handleGcCountdown = (state: ChannelState): ChannelState => {
  const { scheduledGc } = state;
  if (scheduledGc == null || scheduledGc.countdown <= 0) return state;
  return { ...state, scheduledGc: { ...scheduledGc, countdown: scheduledGc.countdown - 1 } };
};

const handleGc = (state: ChannelState): ChannelState => {
  if (state.scheduledGc == null || state.scheduledGc.countdown > 0) return state;
  const { lowerPos } = state.scheduledGc;
  const gcLowerIndex =
    L.findIndex((message) => message.pos >= lowerPos, state.messages.ordered) - 1;
  if (gcLowerIndex <= MIN_START_GC_COUNT) return { ...state, scheduledGc: null };
  console.debug(`[Messages GC] Start GC. Lower index: ${gcLowerIndex} Power Pos: ${lowerPos}`);
  const messages = state.messages.drop(gcLowerIndex);
  const scheduledGc = null;
  const historyState = state.historyState === 'FULL' ? 'PARTIAL' : state.historyState;
  return { ...state, messages, scheduledGc, historyState };
};

export const channelReducer = (
  state: ChannelState,
  action: ChatActionUnion,
  { initialized }: ChatReducerContext,
): ChannelState => {
  let nextState: ChannelState = channelReducer$(state, action, initialized);
  nextState = handleGcCountdown(nextState);
  if (nextState.messages.length > GC_TRIGGER_LENGTH && !nextState.scheduledGc) {
    const pos = L.nth(GC_TRIGGER_LENGTH >> 1, nextState.messages.ordered)!.pos;
    nextState = { ...nextState, scheduledGc: { countdown: GC_INITIAL_COUNTDOWN, lowerPos: pos } };
  } else if (nextState.scheduledGc) {
    nextState = handleGc(nextState);
  }
  return nextState;
};
