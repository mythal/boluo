import type { EditMessage, Message, NewMessage } from '@boluo/api';
import { binarySearchPosList } from '../sort';
import { type MessageItem, type PreviewItem } from './channel.types';
import { type ChatAction, type ChatActionUnion } from './chat.actions';
import type { ChatReducerContext } from './chat.reducer';
import { recordWarn } from '../error';
import type { List } from 'list';
import * as L from 'list';

export type UserId = string;

const GC_TRIGGER_LENGTH = 128;
const GC_INITIAL_COUNTDOWN = 8;
const MIN_START_GC_COUNT = 4;

export interface OptimisticItem {
  optimisticPos: number;
  timestamp: number;
  item: MessageItem | PreviewItem;
}

export interface OptimisticMessage {
  ref: PreviewItem | MessageItem;
  item: OptimisticItem;
}

const editMessageOptimisticItem = (
  { name, text, entities, inGame, isAction, mediaId, color }: EditMessage,
  previousMessage: MessageItem,
  sendTime: number,
  media: File | null,
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
    color,
  };
  const item: OptimisticItem = { optimisticPos: previousMessage.pos, timestamp: sendTime, item: message };
  return { ref: previousMessage, item };
};

const newMessageOptimisticItem = (
  newMessage: NewMessage,
  preview: PreviewItem,
  sendTime: number,
  media: File | null,
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
    color: newMessage.color,
    text: newMessage.text,
    folded: false,
    modified: created,
    entities: newMessage.entities,
    whisperToUsers: newMessage.whisperToUsers,
    created,
    tags: [],
  };
  const item: OptimisticItem = { optimisticPos: preview.pos, timestamp: sendTime, item: message };
  return { ref: preview, item };
};

export interface ChannelState {
  id: string;
  fullLoaded: boolean;
  messages: List<MessageItem>;
  previewMap: Record<UserId, PreviewItem>;
  optimisticMessages: Record<string, OptimisticMessage>;
  scheduledGc: ScheduledGc | null;
  collidedPreviewIdSet: Set<string>;
}

export interface ScheduledGc {
  countdown: number;
  /** Messages with pos < lower will be deleted */
  lowerPos: number;
}

const makeMessageItem = (message: Message): MessageItem => ({ ...message, type: 'MESSAGE', key: message.id });

export const makeInitialChannelState = (id: string): ChannelState => {
  return {
    id,
    messages: L.empty(),
    fullLoaded: false,
    previewMap: {},
    scheduledGc: null,
    collidedPreviewIdSet: new Set(),
    optimisticMessages: {},
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
    previews.filter((preview) => preview.id !== previewId).map((preview) => [preview.senderId, preview]),
  );
};

const filterOptimisticMessages = (
  refId: string | null | undefined,
  optimisticMessages: Record<string, OptimisticMessage>,
): Record<string, OptimisticMessage> => {
  if (!refId) return optimisticMessages;
  if (refId in optimisticMessages) {
    const nextOptimisticMessages = { ...optimisticMessages };
    delete nextOptimisticMessages[refId];
    return nextOptimisticMessages;
  }
  return optimisticMessages;
};

const handleNewMessage = (state: ChannelState, { payload }: ChatAction<'receiveMessage'>): ChannelState => {
  const { messages } = state;
  const message = makeMessageItem(payload.message);
  const previewMap = filterPreviewMap(payload.previewId, state.previewMap);
  const optimisticMessages = filterOptimisticMessages(payload.previewId, state.optimisticMessages);

  const resetMessagesState = (state: ChannelState): ChannelState => {
    return { ...state, previewMap, optimisticMessages, messages: L.empty(), fullLoaded: false };
  };

  const topMessage = L.first(messages);
  const bottomMessage = L.last(messages);
  if (
    topMessage == null ||
    bottomMessage == null ||
    message.pos === topMessage.pos ||
    message.pos === bottomMessage.pos
  ) {
    return resetMessagesState(state);
  }
  if (message.pos < topMessage.pos) {
    return { ...state, optimisticMessages, messages: state.fullLoaded ? L.prepend(message, messages) : messages };
  }
  if (message.pos > bottomMessage.pos) {
    return { ...state, previewMap, messages: L.append(message, messages), optimisticMessages };
  }
  const [insertIndex, itemByPos] = binarySearchPosList(messages, message.pos);
  if (itemByPos) {
    if (itemByPos.id !== message.id || itemByPos.modified !== message.modified) {
      recordWarn('Unexpected new message position', { message, itemByPos });
      return resetMessagesState(state);
    }
    // Duplicate message
    return { ...state, optimisticMessages };
  }
  return { ...state, previewMap, messages: L.insert(insertIndex, message, messages), optimisticMessages };
};

const handleMessagesLoaded = (state: ChannelState, { payload }: ChatAction<'messagesLoaded'>): ChannelState => {
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
  return { ...state, messages: L.concat(L.reverse(L.map(makeMessageItem, payloadMessages)), state.messages) };
};

const handleMessageSending = (
  state: ChannelState,
  { payload: { newMessage, sendTime, media } }: ChatAction<'messageSending'>,
): ChannelState => {
  if (!newMessage.previewId) return state;
  const preview = Object.values(state.previewMap).find((preview) => preview.id === newMessage.previewId);
  if (!preview) return state;
  const optimisticItem = newMessageOptimisticItem(newMessage, preview, sendTime, media);
  return {
    ...state,
    optimisticMessages: { ...state.optimisticMessages, [newMessage.previewId]: optimisticItem },
  };
};

const handleMessageEditing = (
  state: ChannelState,
  { payload: { editMessage, sendTime, media } }: ChatAction<'messageEditing'>,
): ChannelState => {
  const previousMessage = L.find(({ id }) => id === editMessage.messageId, state.messages);
  if (!previousMessage) return state;
  const optimisticItem = editMessageOptimisticItem(editMessage, previousMessage, sendTime, media);
  return {
    ...state,
    optimisticMessages: { ...state.optimisticMessages, [editMessage.messageId]: optimisticItem },
  };
};

const handleMessageEdited = (state: ChannelState, { payload }: ChatAction<'messageEdited'>): ChannelState => {
  const optimisticMessages = filterOptimisticMessages(payload.message.id, state.optimisticMessages);
  const resetMessagesState = (state: ChannelState): ChannelState => {
    return { ...state, optimisticMessages, messages: L.empty(), fullLoaded: false };
  };
  const message: MessageItem = makeMessageItem(payload.message);
  const { oldPos } = payload;
  const originalTopMessage = L.head(state.messages);
  if (!originalTopMessage) {
    return { ...state, optimisticMessages };
  }
  const moved = oldPos !== message.pos;
  if (!moved) {
    // In-place editing
    if (message.pos < originalTopMessage.pos) return { ...state, optimisticMessages };
    const findResult = findMessage(state.messages, message.id, message.pos);
    if (findResult == null) return { ...state, optimisticMessages };
    const [, index] = findResult;
    return { ...state, messages: L.update(index, message, state.messages), optimisticMessages };
  }
  // Remove the previous message if it loaded
  let messagesState = state.messages;
  if (oldPos >= originalTopMessage.pos) {
    const oldEntry = findMessage(state.messages, message.id, oldPos);
    if (oldEntry != null) {
      const [, index] = oldEntry;
      messagesState = L.remove(index, 1, state.messages);
    }
  }
  const messages = messagesState;
  const topMessage = L.head(messages);
  const bottomMessage = L.last(messages);
  if (!topMessage || !bottomMessage) {
    // The only message has been removed in the previous step
    const moveUp = message.pos < originalTopMessage.pos;
    return { ...state, optimisticMessages, messages: moveUp ? L.empty() : L.of(message) };
  }

  if (message.pos < topMessage.pos) {
    // Move up
    if (oldPos === topMessage.pos) {
      recordWarn('The top message should be removed in the previous step', { message, topMessage });
      return resetMessagesState(state);
    }
    return {
      ...state,
      optimisticMessages,
      messages: state.fullLoaded
        ? L.prepend(message, messages)
        : // The message has been moved out of the loaded range
          messages,
    };
  }
  if (message.pos > bottomMessage.pos) {
    // Move down to the bottom
    return { ...state, optimisticMessages, messages: L.append(message, messages) };
  }
  const [insertIndex, itemByPos] = binarySearchPosList(messages, message.pos);
  if (itemByPos) {
    recordWarn('Unexpected message position in editing', { message, itemByPos, insertIndex });
    return resetMessagesState(state);
  }
  return { ...state, optimisticMessages, messages: L.insert(insertIndex, message, messages) };
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
    newItem = { ...preview, type: 'PREVIEW', posQ, posP, pos, key: preview.senderId, timestamp };
  }

  previewMap = { ...previewMap, [preview.senderId]: newItem };
  return { ...state, previewMap, collidedPreviewIdSet };
};

/**
 * @param messages messages sorted by pos in ascending order
 * @param pos the pos of the message to find. this is just a hint for optimization.
 */
export const findMessage = (messages: List<MessageItem>, id: string, pos?: number): [MessageItem, number] | null => {
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
      recordWarn('Found message by id but failed to find by pos.', {
        id,
        pos,
        index,
        foundIndex,
        foundItemId: foundItem?.id,
        messageId: message.id,
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
  let optimisticMessages: typeof state.optimisticMessages;
  if (messageId in state.optimisticMessages) {
    optimisticMessages = { ...state.optimisticMessages };
    delete optimisticMessages[messageId];
  } else {
    optimisticMessages = state.optimisticMessages;
  }
  const findResult = findMessage(state.messages, messageId, pos);
  if (findResult == null) {
    return { ...state, optimisticMessages };
  }
  const [, index] = findResult;
  return { ...state, optimisticMessages, messages: L.remove(index, 1, state.messages) };
};

const handleResetGc = (state: ChannelState, { payload: { pos } }: ChatAction<'resetGc'>): ChannelState => {
  if (state.scheduledGc == null) return state;
  const { lowerPos } = state.scheduledGc;
  if (pos >= lowerPos) return state;
  return { ...state, scheduledGc: { countdown: GC_INITIAL_COUNTDOWN, lowerPos: pos } };
};

const handleSetOptimisticMessage = (
  state: ChannelState,
  { payload }: ChatAction<'setOptimisticMessage'>,
): ChannelState => {
  return { ...state, optimisticMessages: { ...state.optimisticMessages, [payload.ref.id]: payload } };
};

const handleRemoveOptimisticMessage = (
  state: ChannelState,
  { payload: { id } }: ChatAction<'removeOptimisticMessage'>,
): ChannelState => {
  const optimisticMessages = { ...state.optimisticMessages };
  delete optimisticMessages[id];
  return { ...state, optimisticMessages };
};

const handleFail = (state: ChannelState, { payload }: ChatAction<'fail'>): ChannelState => {
  const { failTo, key } = payload;
  if (failTo.type === 'SEND') {
    const optimisticMessage = state.optimisticMessages[key];
    if (!optimisticMessage) return state;
    const chatItem = optimisticMessage.item.item;
    if (chatItem.type !== 'MESSAGE') return state;
    const item: MessageItem = { ...chatItem, failTo };
    const optimisticItem: OptimisticItem = { ...optimisticMessage.item, item };
    const optimisticMessages: ChannelState['optimisticMessages'] = {
      ...state.optimisticMessages,
      [optimisticMessage.ref.id]: { ...optimisticMessage, item: optimisticItem },
    };
    return { ...state, optimisticMessages };
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

const channelReducer$ = (state: ChannelState, action: ChatActionUnion, initialized: boolean): ChannelState => {
  switch (action.type) {
    case 'messagePreview':
      return handleMessagePreview(state, action);
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

const checkOrder = (messages: List<MessageItem>, action: ChatActionUnion): List<MessageItem> => {
  let prevPos = -1;
  let i = 0;
  const firstPos = L.first(messages)?.pos;
  const lastPos = L.last(messages)?.pos;
  for (const message of messages) {
    if (message.pos < prevPos) {
      recordWarn('Messages are not sorted by pos.', {
        action,
        payload: action.type === 'messageEdited' ? action.payload.message : action.payload,
        message,
        pos: message.pos,
        prevPos,
        firstPos,
        lastPos,
        index: i,
        size: messages.length,
      });
      return L.sortBy(({ pos }) => pos, messages);
    }
    prevPos = message.pos;
    i += 1;
  }
  return messages;
};

export const channelReducer = (
  state: ChannelState,
  action: ChatActionUnion,
  { initialized }: ChatReducerContext,
): ChannelState => {
  let nextState: ChannelState = channelReducer$(state, action, initialized);
  let messages = nextState.messages;
  switch (action.type) {
    case 'messageEdited':
    case 'receiveMessage':
    case 'messagesLoaded':
      messages = checkOrder(messages, action);
      break;
  }
  if (messages !== nextState.messages) {
    nextState = { ...nextState, messages };
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
