import type { Message } from '@boluo/api';
import { binarySearchPos, byPos } from '../sort';
import { type MessageItem, type PreviewItem } from './channel.types';
import { type ChatAction, type ChatActionUnion } from './chat.actions';
import type { ChatReducerContext } from './chat.reducer';
import { recordWarn } from '../error';

export type UserId = string;

const GC_TRIGGER_LENGTH = 128;
const GC_INITIAL_COUNTDOWN = 8;
const MIN_START_GC_COUNT = 4;

export interface ChannelState {
  id: string;
  fullLoaded: boolean;
  messageMap: Record<string, MessageItem>;
  /** Values of the messageMap, sorted */
  messages: MessageItem[];
  previewMap: Record<UserId, PreviewItem>;
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
    messages: [],
    messageMap: {},
    fullLoaded: false,
    previewMap: {},
    scheduledGc: null,
    collidedPreviewIdSet: new Set(),
  };
};

const handleNewMessage = (state: ChannelState, { payload }: ChatAction<'receiveMessage'>): ChannelState => {
  const prevMessageMap = state.messageMap;
  const message = makeMessageItem(payload.message);
  let { previewMap } = state;
  const previews = Object.values(previewMap);
  if (payload.previewId && previews.find((preview) => preview.id === payload.previewId)) {
    previewMap = Object.fromEntries(
      previews.filter((preview) => preview.id !== payload.previewId).map((preview) => [preview.senderId, preview]),
    );
  }

  if (state.messages.length === 0) {
    const messageMap = { [message.id]: message };
    return { ...state, messageMap, previewMap };
  }

  const minPos = state.messages[0]!.pos;
  if (message.pos <= minPos && !state.fullLoaded) {
    return state;
  }
  if (message.id in prevMessageMap) {
    recordWarn('Received a duplicate new message.', { message, prevMessage: prevMessageMap[message.id] });
    return state;
  }
  const messageMap = { ...prevMessageMap, [message.id]: message };
  return { ...state, messageMap, previewMap };
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
  if (payload.messages.length === 0) {
    return state;
  }
  const newMessageEntries: Array<[string, MessageItem]> = [...payload.messages].map((message) => [
    message.id,
    makeMessageItem(message),
  ]);
  const payloadMinPos = payload.messages.at(-1)!.pos;
  if (state.messages.length === 0) {
    return { ...state, messageMap: Object.fromEntries(newMessageEntries) };
  }
  const stateMinPos = state.messages[0]!.pos;
  if (stateMinPos <= payloadMinPos) {
    if (stateMinPos === payloadMinPos && state.messages.length >= payload.messages.length) {
      // Maybe this is a duplicate messages load
      console.log('Received messages that are already loaded');
      return state;
    }
    recordWarn('Received messages that are older than the ones already loaded', {
      payloadMinPos,
      stateMinPos,
      payloadLenght: payload.messages.length,
      stateLength: state.messages.length,
    });
    return state;
  }
  const messageMap = { ...state.messageMap };
  for (const [id, item] of newMessageEntries) {
    messageMap[id] = item;
  }
  return { ...state, messageMap };
};

const handleMessageEdited = (state: ChannelState, { payload }: ChatAction<'messageEdited'>): ChannelState => {
  const message: MessageItem = makeMessageItem(payload.message);
  if (state.messages.length === 0) {
    return state;
  }
  if (message.pos < state.messages[0]!.pos && !state.fullLoaded) {
    if (message.id in state.messageMap) {
      // The edited message has been moved out of the range of currently loaded messages.
      const messageMap = { ...state.messageMap };
      delete messageMap[message.id];
      return { ...state, messageMap };
    } else {
      return state;
    }
  }

  const messageMap = { ...state.messageMap };
  messageMap[message.id] = message;
  return { ...state, messageMap };
};

const handleMessagePreview = (
  state: ChannelState,
  { payload: { preview, timestamp } }: ChatAction<'messagePreview'>,
): ChannelState => {
  let { previewMap, collidedPreviewIdSet } = state;
  // The `preview.pos` is supposed to be integer, just `ceil` it to be safe.
  let pos = Math.ceil(preview.pos);
  let posP = pos;
  let posQ = 1;
  if (preview.edit && preview.id in state.messageMap) {
    const message = state.messageMap[preview.id]!;
    if (message.senderId !== preview.senderId) {
      return state;
    }
    pos = message.pos;
    posP = message.posP;
    posQ = message.posQ;
  } else if (preview.edit === null) {
    const index = binarySearchPos(state.messages, pos);
    if (state.messages[index]?.pos === pos) {
      collidedPreviewIdSet = new Set(collidedPreviewIdSet);
      collidedPreviewIdSet.add(preview.id);
    }
  }

  const chatItem: PreviewItem = { ...preview, type: 'PREVIEW', posQ, posP, pos, key: preview.senderId, timestamp };
  previewMap = { ...previewMap, [preview.senderId]: chatItem };
  return { ...state, previewMap, collidedPreviewIdSet };
};

const handleMessageDeleted = (
  state: ChannelState,
  { payload: { messageId } }: ChatAction<'messageDeleted'>,
): ChannelState => {
  if (!(messageId in state.messageMap)) {
    return state;
  }
  const messageMap = { ...state.messageMap };
  delete messageMap[messageId];
  return { ...state, messageMap };
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
  const gcLowerIndex = state.messages.findIndex((message) => message.pos >= lowerPos) - 1;
  if (gcLowerIndex <= MIN_START_GC_COUNT) return { ...state, scheduledGc: null };
  console.debug(`[Messages GC] Start GC. Lower index: ${gcLowerIndex} Power Pos: ${lowerPos}`);
  const messages = state.messages.slice(gcLowerIndex);
  const messageMap = Object.fromEntries(messages.map((message) => [message.id, message]));
  const scheduledGc = null;
  const fullLoaded = false;
  return { ...state, messageMap, messages, scheduledGc, fullLoaded };
};

export const channelReducer = (
  state: ChannelState,
  action: ChatActionUnion,
  { initialized }: ChatReducerContext,
): ChannelState => {
  let nextState: ChannelState = channelReducer$(state, action, initialized);
  nextState = handleGcCountdown(nextState);
  if (nextState.messageMap !== state.messageMap) {
    const messages = Object.values(nextState.messageMap);
    messages.sort(byPos);
    nextState = { ...nextState, messages };
  }
  if (nextState.messages.length > GC_TRIGGER_LENGTH && !nextState.scheduledGc) {
    const pos = nextState.messages[GC_TRIGGER_LENGTH >> 1]!.pos;
    nextState = { ...nextState, scheduledGc: { countdown: GC_INITIAL_COUNTDOWN, lowerPos: pos } };
  } else if (nextState.scheduledGc) {
    nextState = handleGc(nextState);
  }
  return nextState;
};
