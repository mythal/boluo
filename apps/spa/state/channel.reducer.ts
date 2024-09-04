import type { Message, NewMessage } from '@boluo/api';
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
  newMessage: NewMessage;
  preview: PreviewItem;
  item: OptimisticItem;
}

const optimisticMessageToOptimisticItem = (
  newMessage: NewMessage,
  preview: PreviewItem,
  sendTime: number,
): OptimisticMessage => {
  const created = new Date(sendTime).toISOString();
  const id = newMessage.previewId ?? preview.id;
  const message: MessageItem = {
    key: id,
    optimistic: true,
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
  return { newMessage, preview, item };
};

export interface ChannelState {
  id: string;
  fullLoaded: boolean;
  messages: List<MessageItem>;
  previewMap: Record<UserId, PreviewItem>;
  optimisticMessages: List<OptimisticMessage>;
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
    optimisticMessages: L.empty(),
  };
};

const handleNewMessage = (state: ChannelState, { payload }: ChatAction<'receiveMessage'>): ChannelState => {
  let { messages } = state;
  const message = makeMessageItem(payload.message);
  let { previewMap, optimisticMessages } = state;
  const previews = Object.values(previewMap);
  if (payload.previewId && previews.find((preview) => preview.id === payload.previewId)) {
    previewMap = Object.fromEntries(
      previews.filter((preview) => preview.id !== payload.previewId).map((preview) => [preview.senderId, preview]),
    );
  }
  if (payload.previewId) {
    optimisticMessages = L.filter(({ newMessage }) => newMessage.previewId !== payload.previewId, optimisticMessages);
  }

  const topMessage = L.first(messages);
  const bottomMessage = L.last(messages);
  if (topMessage == null || bottomMessage == null) {
    return { ...state, messages: L.of(message), previewMap, optimisticMessages };
  }
  if (message.pos <= topMessage.pos && !state.fullLoaded) {
    return { ...state, optimisticMessages };
  }
  if (message.pos > bottomMessage.pos) {
    return { ...state, previewMap, messages: L.append(message, messages), optimisticMessages };
  }
  const [insertIndex, itemByPos] = binarySearchPosList(messages, message.pos);
  if (itemByPos) {
    if (itemByPos.id !== message.id) {
      recordWarn('Unexpected message position.', { message, itemByPos });
    }
    return { ...state, optimisticMessages };
  }
  messages = L.insert(insertIndex, message, messages);
  return { ...state, previewMap, messages, optimisticMessages };
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

const handleMessageSent = (
  state: ChannelState,
  { payload: { newMessage, sendTime } }: ChatAction<'messageSent'>,
): ChannelState => {
  if (!newMessage.previewId) return state;
  const preview = Object.values(state.previewMap).find((preview) => preview.id === newMessage.previewId);
  if (!preview) return state;
  return {
    ...state,
    optimisticMessages: L.append(
      optimisticMessageToOptimisticItem(newMessage, preview, sendTime),
      state.optimisticMessages,
    ),
  };
};

const handleMessageEdited = (state: ChannelState, { payload }: ChatAction<'messageEdited'>): ChannelState => {
  const message: MessageItem = makeMessageItem(payload.message);
  const { oldPos } = payload;
  const topMessage = L.head(state.messages);
  if (!topMessage) {
    return state;
  }
  if (message.pos < topMessage.pos && !state.fullLoaded) {
    if (oldPos === message.pos || oldPos < topMessage.pos) {
      return state;
    }
    // The edited message has been moved out of the range of currently loaded messages.
    const findResult = findMessage(state.messages, message.id, oldPos);
    if (findResult == null) return state;
    const [, index] = findResult;
    return { ...state, messages: L.remove(index, 1, state.messages) };
  } else if (message.pos === oldPos) {
    // Edit the message in place
    const findResult = findMessage(state.messages, message.id, message.pos);
    if (findResult == null) return state;
    const [, index] = findResult;
    return { ...state, messages: L.update(index, message, state.messages) };
  } else {
    // The message has been moved to a new position
    let messages = state.messages;
    const findResult = findMessage(state.messages, message.id, oldPos);
    if (findResult != null) {
      const [, index] = findResult;
      messages = L.remove(index, 1, state.messages);
    }
    if (message.pos < topMessage.pos) {
      return { ...state, messages: L.prepend(message, messages) };
    }
    const last = L.last(messages);
    if (last == null || message.pos > last.pos) {
      return { ...state, messages: L.append(message, messages) };
    }
    const [insertIndex, itemByPos] = binarySearchPosList(messages, message.pos);
    if (itemByPos) {
      console.warn('Unexpected message position.', { message, itemByPos });
      return state;
    }
    messages = L.insert(insertIndex, message, messages);
    return { ...state, messages };
  }
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
  let failedFoundByPos = false;
  if (pos != null) {
    const [index, item] = binarySearchPosList(messages, pos);
    if (item && item.id === id) {
      return [item, index];
    }
    failedFoundByPos = true;
  }
  const index = L.findIndex((message) => message.id === id, messages);
  if (index === -1) {
    return null;
  }
  const message = L.nth(index, messages);
  if (message?.id === id) {
    if (failedFoundByPos) {
      const [index, item] = binarySearchPosList(messages, pos!);
      recordWarn('Found message by id but failed to find by pos.', {
        id,
        pos,
        realIndex: index,
        foundIndex: index,
        itemId: item?.id,
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
  const findResult = findMessage(state.messages, messageId, pos);
  if (findResult == null) {
    return state;
  }
  const [, index] = findResult;
  return { ...state, messages: L.remove(index, 1, state.messages) };
};

const handleResetGc = (state: ChannelState, { payload: { pos } }: ChatAction<'resetGc'>): ChannelState => {
  if (state.scheduledGc == null) return state;
  const { lowerPos } = state.scheduledGc;
  if (pos >= lowerPos) return state;
  return { ...state, scheduledGc: { countdown: GC_INITIAL_COUNTDOWN, lowerPos: pos } };
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
    case 'messageSent':
      return handleMessageSent(state, action);
    case 'messagesLoaded':
      // This action is triggered by the user
      // and should be ignored if the chat state
      // has not been initialized.
      return initialized ? handleMessagesLoaded(state, action) : state;
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
  let lastPos = 0;
  for (const message of messages) {
    if (message.pos < lastPos) {
      recordWarn('Messages are not sorted by pos.', { action, message });
      return L.sortBy(({ pos }) => pos, messages);
    }
    lastPos = message.pos;
  }
  return messages;
};

export const channelReducer = (
  state: ChannelState,
  action: ChatActionUnion,
  { initialized }: ChatReducerContext,
): ChannelState => {
  let nextState: ChannelState = channelReducer$(state, action, initialized);
  const reorderedMessages = checkOrder(nextState.messages, action);
  if (reorderedMessages !== nextState.messages) {
    nextState = { ...nextState, messages: reorderedMessages };
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
