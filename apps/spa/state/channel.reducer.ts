import type {
  EditMessage,
  Message,
  NewMessage,
  Preview,
  PreviewDiffOp,
  PreviewDiffPost,
} from '@boluo/api';
import { binarySearchPosList } from '@boluo/sort';
import { parse } from '@boluo/interpreter';
import { type MessageItem, type PreviewItem, type PreviewKeyframe } from './channel.types';
import { type ChatAction, type ChatActionUnion } from './chat.actions';
import type { ChatReducerContext } from './chat.reducer';
import { recordWarn } from '../error';
import type { List } from 'list';
import * as L from 'list';
import { type ComposeState } from './compose.reducer';

export type UserId = string;

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

const toPreviewKeyframe = (preview: Preview): PreviewKeyframe => ({
  id: preview.id,
  version: preview.v ?? 0,
  name: preview.name,
  text: preview.text ?? null,
  entities: preview.entities,
});

const applyPreviewDiffOps = (
  keyframe: PreviewKeyframe,
  ops: PreviewDiffOp[],
): { text: string | null; name: string; textChanged: boolean } | null => {
  const baseText = keyframe.text;
  let nextText = baseText ?? '';
  let textChanged = false;
  let name = keyframe.name;
  for (const op of ops) {
    switch (op.type) {
      case 'SPLICE': {
        const start = op.i;
        const deleteCount = op.len;
        if (
          !Number.isFinite(start) ||
          !Number.isFinite(deleteCount) ||
          start < 0 ||
          deleteCount < 0
        ) {
          return null;
        }
        const deleteEnd = start + deleteCount;
        if (start > nextText.length || deleteEnd > nextText.length) {
          return null;
        }
        nextText = nextText.slice(0, start) + op._ + nextText.slice(deleteEnd);
        textChanged = true;
        break;
      }
      case 'A':
        nextText += op._;
        textChanged = true;
        break;
      case 'NAME':
        name = op.name;
        break;
    }
  }
  if (textChanged && baseText == null) {
    return null;
  }
  return { text: textChanged ? nextText : baseText, name, textChanged };
};

const parsePreviewDiffEntities = (
  text: string,
  fallback: PreviewItem['entities'],
): PreviewItem['entities'] => {
  try {
    return parse(text).entities;
  } catch (error) {
    recordWarn('Failed to parse preview diff text', { text, error });
    return fallback;
  }
};

const editMessageOptimisticItem = (
  { name, text, entities = [], inGame, isAction, mediaId, color }: EditMessage,
  previousMessage: MessageItem,
  sendTime: number,
  media: File | null,
  composeState?: ComposeState,
): OptimisticMessage => {
  const message: MessageItem = {
    ...previousMessage,
    optimistic: true,
    optimisticMedia: media,
    name,
    text,
    entities,
    inGame,
    isAction,
    mediaId,
    color: color ?? '',
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

export interface ChannelState {
  id: string;
  fullLoaded: boolean;
  messages: List<MessageItem>;
  previewMap: Record<UserId, PreviewItem>;
  optimisticMessageMap: Record<string, OptimisticMessage>;
  scheduledGc: ScheduledGc | null;
  collidedPreviewIdSet: Set<string>;
}

export interface ScheduledGc {
  countdown: number;
  /** Messages with pos < lower will be deleted */
  lowerPos: number;
}

const makeMessageItem = (message: Message): MessageItem => ({
  ...message,
  type: 'MESSAGE',
  key: message.id,
});

export const makeInitialChannelState = (id: string): ChannelState => {
  return {
    id,
    messages: L.empty(),
    fullLoaded: false,
    previewMap: {},
    scheduledGc: null,
    collidedPreviewIdSet: new Set(),
    optimisticMessageMap: {},
  };
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
  { payload }: ChatAction<'receiveMessage'>,
): ChannelState => {
  const { messages } = state;
  const message = makeMessageItem(payload.message);
  const previewMap = filterPreviewMap(payload.previewId, state.previewMap);
  const optimisticMessageMap = filterOptimisticMessages(
    payload.previewId,
    state.optimisticMessageMap,
  );

  const resetMessagesState = (state: ChannelState): ChannelState => {
    return { ...state, previewMap, optimisticMessageMap, messages: L.empty(), fullLoaded: false };
  };

  const topMessage = L.first(messages);
  const bottomMessage = L.last(messages);
  if ((topMessage == null || bottomMessage == null) && state.fullLoaded) {
    return { ...state, previewMap, optimisticMessageMap, messages: L.of(message) };
  } else if (
    topMessage == null ||
    bottomMessage == null ||
    message.pos === topMessage.pos ||
    message.pos === bottomMessage.pos
  ) {
    return resetMessagesState(state);
  }
  if (message.pos < topMessage.pos) {
    return {
      ...state,
      optimisticMessageMap,
      messages: state.fullLoaded ? L.prepend(message, messages) : messages,
    };
  }
  if (message.pos > bottomMessage.pos) {
    return { ...state, previewMap, messages: L.append(message, messages), optimisticMessageMap };
  }
  const [insertIndex, itemByPos] = binarySearchPosList(messages, message.pos);
  if (itemByPos) {
    if (itemByPos.id !== message.id || itemByPos.modified !== message.modified) {
      recordWarn('Unexpected new message position', { message, itemByPos });
      return resetMessagesState(state);
    }
    // Duplicate message
    return { ...state, optimisticMessageMap };
  }
  return {
    ...state,
    previewMap,
    messages: L.insert(insertIndex, message, messages),
    optimisticMessageMap,
  };
};

const handleMessagesLoaded = (
  state: ChannelState,
  { payload }: ChatAction<'messagesLoaded'>,
): ChannelState => {
  // Note:
  // The payload.messages are sorted in descending order
  // But the state.messages are sorted in ascending order
  const { fullLoaded } = payload;
  if (state.fullLoaded) {
    return state;
  }
  if (fullLoaded !== state.fullLoaded) {
    state = { ...state, fullLoaded };
  }
  let payloadMessages = L.from(payload.messages);
  const payloadLen = payloadMessages.length;
  if (payloadLen === 0) {
    return state;
  }
  const topMessage = L.first(state.messages);
  if (!topMessage) {
    return { ...state, messages: L.reverse(L.map(makeMessageItem, payloadMessages)) };
  }
  payloadMessages = L.dropWhile((message) => message.pos >= topMessage.pos, payloadMessages);
  if (payloadMessages.length === 0) {
    return state;
  }
  return {
    ...state,
    messages: L.concat(L.reverse(L.map(makeMessageItem, payloadMessages)), state.messages),
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
  { payload: { editMessage, sendTime, media, composeState } }: ChatAction<'messageEditing'>,
): ChannelState => {
  const previousMessage = L.find(({ id }) => id === editMessage.messageId, state.messages);
  if (!previousMessage) return state;
  const optimisticItem = editMessageOptimisticItem(
    editMessage,
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

const handleMessageEdited = (
  state: ChannelState,
  { payload }: ChatAction<'messageEdited'>,
): ChannelState => {
  const optimisticMessageMap = filterOptimisticMessages(
    payload.message.id,
    state.optimisticMessageMap,
  );
  const resetMessagesState = (state: ChannelState): ChannelState => {
    return { ...state, optimisticMessageMap, messages: L.empty(), fullLoaded: false };
  };
  const message: MessageItem = makeMessageItem(payload.message);
  const originalTopMessage = L.head(state.messages);
  if (!originalTopMessage) {
    return { ...state, optimisticMessageMap };
  }
  // Remove the previous message if it loaded
  let messagesState = state.messages;
  if (payload.oldPos >= originalTopMessage.pos) {
    const oldEntry = findMessage(messagesState, message.id, payload.oldPos);
    if (oldEntry != null) {
      const [item, index] = oldEntry;
      const modifiedDiff = compareMessageModified(item, message);
      if (
        modifiedDiff > 0 ||
        (modifiedDiff === 0 &&
          /* FIXME: move the message will not change the `modified` field */
          item.pos === message.pos &&
          /* Show a whisper message */
          message.text === item.text)
      ) {
        return state;
      }
      if (item.pos === message.pos) {
        // In-place editing
        return {
          ...state,
          messages: L.update(index, message, state.messages),
          optimisticMessageMap,
        };
      }
      messagesState = L.remove(index, 1, state.messages);
    }
  }
  const messages = messagesState;
  const topMessage = L.head(messages);
  const bottomMessage = L.last(messages);
  if (!topMessage || !bottomMessage) {
    // The only message has been removed in the previous step
    const moveUp = message.pos < originalTopMessage.pos;
    const movedOut = moveUp && !state.fullLoaded;
    return { ...state, optimisticMessageMap, messages: movedOut ? L.empty() : L.of(message) };
  }

  if (message.pos < topMessage.pos) {
    // Move up
    return {
      ...state,
      optimisticMessageMap,
      messages: state.fullLoaded
        ? L.prepend(message, messages)
        : // The message has been moved out of the loaded range
          messages,
    };
  }
  if (message.pos > bottomMessage.pos) {
    // Move down to the bottom
    return { ...state, optimisticMessageMap, messages: L.append(message, messages) };
  }
  const [insertIndex, itemByPos] = binarySearchPosList(messages, message.pos);
  if (itemByPos) {
    recordWarn('Unexpected message position in editing', { message, itemByPos, insertIndex });
    return resetMessagesState(state);
  }
  return { ...state, optimisticMessageMap, messages: L.insert(insertIndex, message, messages) };
};

const handleMessagePreview = (
  state: ChannelState,
  { payload: { preview, timestamp } }: ChatAction<'messagePreview'>,
): ChannelState => {
  let newItem: PreviewItem;
  let { previewMap, collidedPreviewIdSet } = state;
  if (preview.edit != null) {
    const findResult = findMessage(state.messages, preview.id, preview.pos);
    if (findResult == null) return state;
    const [message] = findResult;
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
      timestamp,
      keyframe: toPreviewKeyframe(preview),
    };
  } else {
    // The `preview.pos` is supposed to be integer, just `ceil` it to be safe.
    const pos = Math.ceil(preview.pos);
    const posP = pos;
    const posQ = 1;
    const [, itemByPos] = binarySearchPosList(state.messages, pos);
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
      timestamp,
      keyframe: toPreviewKeyframe(preview),
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
  const keyframe = preview.keyframe ?? toPreviewKeyframe(preview);
  const payload: PreviewDiffPost = diff._;
  if (payload.id !== keyframe.id || payload.ref !== keyframe.version) {
    return state;
  }
  const currentVersion = preview.v ?? keyframe.version;
  if (payload.v != null && payload.v <= currentVersion) {
    return state;
  }
  const result = applyPreviewDiffOps(keyframe, payload.op);
  if (!result) {
    return state;
  }
  const { text, name } = result;
  let entities: PreviewItem['entities'] = keyframe.entities;
  if (payload.xs != null && payload.xs.length > 0) {
    entities = payload.xs;
  } else if (text != null) {
    entities = parsePreviewDiffEntities(text, keyframe.entities);
  }
  const nextPreview: PreviewItem = {
    ...preview,
    name,
    text,
    entities,
    v: payload.v ?? preview.v ?? keyframe.version,
    timestamp,
    keyframe,
  };
  return {
    ...state,
    previewMap: { ...state.previewMap, [diff.sender]: nextPreview },
  };
};

/**
 * @param messages messages sorted by pos in ascending order
 * @param pos the pos of the message to find. this is just a hint for optimization.
 */
export const findMessage = (
  messages: List<MessageItem>,
  id: string,
  pos?: number,
): [MessageItem, number] | null => {
  let failedFoundByPos: [MessageItem | null, number] | null = null;
  if (pos != null) {
    const [index, item] = binarySearchPosList(messages, pos);
    if (item && item.id === id) {
      return [item, index];
    }
    // Unexpected message position
    failedFoundByPos = [item, index];
  }
  const index = L.findIndex((message) => message.id === id, messages);
  if (index === -1) {
    return null;
  }
  const message = L.nth(index, messages);
  if (message?.id === id) {
    if (failedFoundByPos != null) {
      const [foundItem, foundIndex] = failedFoundByPos;
      recordWarn('Found message by id but failed to find by pos', {
        id,
        pos,
        index,
        foundIndex,
        foundItemId: foundItem?.id,
        messagePos: message.pos,
      });
    }
    return [message, index];
  } else {
    return null;
  }
};

const handleMessageDeleted = (
  state: ChannelState,
  { payload: { messageId, pos } }: ChatAction<'messageDeleted'>,
): ChannelState => {
  let optimisticMessageMap: typeof state.optimisticMessageMap;
  if (messageId in state.optimisticMessageMap) {
    optimisticMessageMap = { ...state.optimisticMessageMap };
    delete optimisticMessageMap[messageId];
  } else {
    optimisticMessageMap = state.optimisticMessageMap;
  }
  const findResult = findMessage(state.messages, messageId, pos);
  if (findResult == null) {
    return { ...state, optimisticMessageMap };
  }
  const [, index] = findResult;
  return { ...state, optimisticMessageMap, messages: L.remove(index, 1, state.messages) };
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
  { payload: { id } }: ChatAction<'removeOptimisticMessage'>,
): ChannelState => {
  const optimisticMessageMap = { ...state.optimisticMessageMap };
  delete optimisticMessageMap[id];
  return { ...state, optimisticMessageMap };
};

const handleFail = (state: ChannelState, { payload }: ChatAction<'fail'>): ChannelState => {
  const { failTo, key } = payload;
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
  const messageIndex = L.findIndex((message) => message.id === key, state.messages);
  let messages = state.messages;
  if (messageIndex !== -1) {
    const message = L.nth(messageIndex, state.messages)!;
    messages = L.update(messageIndex, { ...message, failTo }, state.messages);
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
      return handleMessageEdited(state, action);
    case 'messageDeleted':
      return handleMessageDeleted(state, action);
    case 'messageSending':
      return handleMessageSending(state, action);
    case 'messageEditing':
      return handleMessageEditing(state, action);
    case 'setOptimisticMessage':
      return handleSetOptimisticMessage(state, action);
    case 'removeOptimisticMessage':
      return handleRemoveOptimisticMessage(state, action);
    case 'messagesLoaded':
      // This action is triggered by the user
      // and should be ignored if the chat state
      // has not been initialized.
      return initialized ? handleMessagesLoaded(state, action) : state;
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
  const gcLowerIndex = L.findIndex((message) => message.pos >= lowerPos, state.messages) - 1;
  if (gcLowerIndex <= MIN_START_GC_COUNT) return { ...state, scheduledGc: null };
  console.debug(`[Messages GC] Start GC. Lower index: ${gcLowerIndex} Power Pos: ${lowerPos}`);
  const messages = L.drop(gcLowerIndex, state.messages);
  const scheduledGc = null;
  const fullLoaded = false;
  return { ...state, messages, scheduledGc, fullLoaded };
};

const CHECK_COUNT = 512;
const checkOrder = (state: ChannelState, action: ChatActionUnion): ChannelState => {
  let prevPos = Number.MAX_SAFE_INTEGER;
  let i = 0;
  const messages = state.messages;
  const firstPos = L.first(messages)?.pos;
  const lastPos = L.last(messages)?.pos;
  for (const message of L.backwards(messages)) {
    if (i > CHECK_COUNT) break;
    if (message.pos >= prevPos) {
      recordWarn('Messages are not sorted by pos', {
        actionType: action.type,
        actionPayload: action.payload,
        message,
        pos: message.pos,
        prevPos,
        firstPos,
        lastPos,
        index: i,
        size: messages.length,
      });
      return { ...state, messages: L.empty(), fullLoaded: false };
    }
    prevPos = message.pos;
    i += 1;
  }
  return state;
};

export const channelReducer = (
  state: ChannelState,
  action: ChatActionUnion,
  { initialized }: ChatReducerContext,
): ChannelState => {
  let nextState: ChannelState = channelReducer$(state, action, initialized);
  switch (action.type) {
    case 'messagePreview':
    case 'messagePreviewDiff':
    case 'setOptimisticMessage':
    case 'removeOptimisticMessage':
    case 'resetGc':
      break;
    default:
      nextState = checkOrder(nextState, action);
  }
  nextState = handleGcCountdown(nextState);
  if (nextState.messages.length > GC_TRIGGER_LENGTH && !nextState.scheduledGc) {
    const pos = L.nth(GC_TRIGGER_LENGTH >> 1, nextState.messages)!.pos;
    nextState = { ...nextState, scheduledGc: { countdown: GC_INITIAL_COUNTDOWN, lowerPos: pos } };
  } else if (nextState.scheduledGc) {
    nextState = handleGc(nextState);
  }
  return nextState;
};
