import { List, Map } from 'immutable';
import * as O from 'optics-ts';
import {
  Action,
  AddDice,
  CancelEdit,
  ChatLoaded,
  ChatUpdate,
  ComposeEditFailed,
  ComposeSendFailed,
  LoadMessages,
  MovingMessage,
  ResetComposeAfterSent,
  ResetMessageMoving,
  RestoreComposeState,
  SetBroadcast,
  SetComposeMedia,
  SetComposeSource,
  SetInGame,
  SetInputName,
  SetIsAction,
  SetWhisperTo,
  StartEditMessage,
  StopEditMessage,
} from '../actions';
import { Channel, makeMembers, Member } from '../api/channels';
import { compareEvents, EventId, eventIdMax, Events, Preview } from '../api/events';
import { Message, MessageOrder } from '../api/messages';
import { SpaceWithRelated } from '../api/spaces';
import { Entity } from '../interpreter/entities';
import { DEBUG } from '../settings';
import {
  addItem,
  ChatItem,
  ChatItemSet,
  deleteMessage,
  editMessage,
  makeMessageItem,
  markMessageMoving,
  moveMessages,
  resetMovingMessage,
  updateMessagesOrder,
} from '../states/chat-item-set';
import { Id, newId } from '../utils/id';

export interface UserItem {
  label: string;
  value: string;
}

export interface Compose {
  initialized: boolean;
  inputName: string;
  isAction: boolean;
  entities: Entity[];
  sending: boolean;
  editFor: string | null;
  messageId: Id;
  media: File | string | undefined;
  source: string;
  whisperTo: UserItem[] | null | undefined;
  inGame: boolean;
  broadcast: boolean;
}

export interface ChatState {
  channel: Channel;
  members: Member[];
  colorMap: Map<Id, string>;
  initialized: boolean;
  // heartbeatMap: Map<Id, number>;
  itemSet: ChatItemSet;
  finished: boolean;
  eventAfter: EventId;
  lastLoadBefore: number;
  filter: 'IN_GAME' | 'OUT_GAME' | 'NONE';
  showFolded: boolean;
  moving: boolean;
  postponed: List<Action>;
  compose: Compose;
}

const focusItemSet = O.optic<ChatState>().prop('itemSet');

const loadChat = (prevState: ChatState | undefined, { chat }: ChatLoaded): ChatState => {
  if (prevState?.channel.id === chat.channel.id) {
    // reload
    const { channel, members, colorMap } = chat;
    return { ...prevState, channel, members, colorMap };
  }
  return chat;
};

const updateChat = (state: ChatState, { id, chat }: ChatUpdate): ChatState => {
  if (id !== state.channel.id) {
    return state;
  }
  return { ...state, ...chat };
};

export const closeChat = (state: ChatState, channelId: Id): ChatState | undefined => {
  if (channelId !== state.channel.id) {
    return state;
  }
  return undefined;
};

const loadMessages = (chat: ChatState, { messages, finished }: LoadMessages, myId: Id | undefined): ChatState => {
  const len = messages.length;
  if (len === 0) {
    return { ...chat, finished };
  }
  const makeItem = makeMessageItem(myId);
  const top = chat.itemSet.messages.first();
  if (top && messages[0].pos >= top.pos) {
    throw new Error('Incorrect messages order');
  }
  messages.sort((a, b) => {
    return b.pos - a.pos;
  });
  messages = messages.reverse();
  const itemSet: ChatItemSet = {
    ...chat.itemSet,
    messages: chat.itemSet.messages.unshift(...messages.map(makeItem)),
  };
  return { ...chat, finished, itemSet };
};

const handleEditMessage = (chatState: ChatState, message: Message, myId: Id | undefined): ChatState => {
  const item = makeMessageItem(myId)(message);
  const itemSet = editMessage(chatState.itemSet, item, chatState.finished);
  return { ...chatState, itemSet };
};

const handleMessageDelete = (itemSet: ChatItemSet, messageId: Id): ChatItemSet => {
  return deleteMessage(itemSet, messageId);
};

const newPreview = (itemSet: ChatItemSet, preview: Preview, myId: Id | undefined): ChatItemSet => {
  const item: ChatItem = {
    type: 'PREVIEW',
    id: preview.senderId,
    mine: preview.senderId === myId,
    pos: preview.pos,
    preview,
  };
  return addItem(itemSet, item);
};

const newMessage = (itemSet: ChatItemSet, message: Message, myId: Id | undefined): ChatItemSet => {
  return addItem(itemSet, makeMessageItem(myId)(message));
};

const handleStartEditMessage = (state: ChatState, { message }: StartEditMessage): ChatState => {
  let whisperTo: Compose['whisperTo'] = null;
  if (message.whisperToUsers) {
    // FIXME: fetch user name.
    whisperTo = message.whisperToUsers.map((user) => ({ label: user, value: user }));
  }
  const compose: Compose = {
    ...state.compose,
    messageId: message.id,
    editFor: message.modified,
    isAction: message.isAction,
    inputName: message.inGame ? message.name : '',
    inGame: message.inGame,
    media: message.mediaId ?? undefined,
    source: message.text,
    whisperTo,
  };

  return { ...state, compose };
};

const handleStopEditMessage = (state: ChatState, { messageId }: StopEditMessage): ChatState => {
  return state;
};

const handleMessageMoving = (state: ChatState, { message, targetItem }: MovingMessage): ChatState => {
  return O.modify(focusItemSet)((itemSet) => markMessageMoving(itemSet, message, targetItem))(state);
};

const handleResetMessageMoving = (state: ChatState, { messageId }: ResetMessageMoving): ChatState => {
  const itemSet = resetMovingMessage(state.itemSet, messageId);
  return { ...state, itemSet };
};
const handleMessagesMoved = (
  itemSet: ChatItemSet,
  movedMessages: Message[],
  orderChanges: MessageOrder[],
  myId?: Id,
): ChatItemSet => {
  itemSet = updateMessagesOrder(itemSet, orderChanges);
  const makeItem = makeMessageItem(myId);
  const messages = moveMessages(itemSet.messages, movedMessages.map(makeItem));
  return { ...itemSet, messages };
};

const updateColorMap = (members: Member[], colorMap: Map<Id, string>): Map<Id, string> => {
  for (const member of members) {
    const { textColor, userId } = member.channel;
    if (textColor !== colorMap.get(userId, null)) {
      if (textColor) {
        colorMap = colorMap.set(userId, textColor);
      } else {
        colorMap = colorMap.remove(userId);
      }
    }
  }
  return colorMap;
};

const ACTION_COMMAND = /^[.。]me\s*/;

const handleSetComposeSource = (state: ChatState, { source }: SetComposeSource): ChatState => {
  let { messageId } = state.compose;
  const prevSource = state.compose.source;
  const isAction = ACTION_COMMAND.test(source);
  if (!state.compose.editFor) {
    if (prevSource.trim() === '' && source.trim() !== '') {
      messageId = newId();
    } else if (!state.compose.broadcast) {
      messageId = newId();
    }
  }
  return { ...state, compose: { ...state.compose, source, messageId, isAction } };
};

const handleSetIsAction = (state: ChatState, action: SetIsAction): ChatState => {
  const oldIsAction = state.compose.isAction;
  let source = state.compose.source;
  let isAction: boolean;
  if (action.isAction === 'TOGGLE') {
    isAction = !oldIsAction;
  } else {
    isAction = action.isAction;
  }
  const match = source.match(ACTION_COMMAND);
  if (isAction && !match) {
    // add ".me" to source
    source = `.me ${source}`;
  } else if (!isAction && match) {
    // remove ".me" from source
    source = source.substring(match[0].length);
  }
  return { ...state, compose: { ...state.compose, isAction, source } };
};

const handleSetBroadcast = (state: ChatState, action: SetBroadcast): ChatState => {
  const oldBroadcast = state.compose.broadcast;
  let broadcast: boolean;
  if (action.broadcast === 'TOGGLE') {
    broadcast = !oldBroadcast;
  } else {
    broadcast = action.broadcast;
  }
  let { messageId } = state.compose;
  if (!broadcast && !state.compose.editFor) {
    messageId = newId();
  }
  return { ...state, compose: { ...state.compose, broadcast, messageId } };
};

const handleSetInGame = (state: ChatState, action: SetInGame): ChatState => {
  const oldInGame = state.compose.inGame;
  let inGame: boolean;
  if (action.inGame === 'TOGGLE') {
    inGame = !oldInGame;
  } else {
    inGame = action.inGame;
  }
  return { ...state, compose: { ...state.compose, inGame } };
};

const handleSetInputName = (state: ChatState, { name }: SetInputName): ChatState => {
  return { ...state, compose: { ...state.compose, inputName: name.trim() } };
};

const handleAddDice = (state: ChatState, { dice }: AddDice): ChatState => {
  const source = `${state.compose.source} {${dice}}`;
  return { ...state, compose: { ...state.compose, source } };
};

const handleSetComposeMedia = (state: ChatState, { media }: SetComposeMedia): ChatState => {
  return { ...state, compose: { ...state.compose, media } };
};

const handleSetWhisperTo = (state: ChatState, { whisperTo }: SetWhisperTo): ChatState => {
  return { ...state, compose: { ...state.compose, whisperTo } };
};

const handleChatInitialized = (myId: Id, channelId: Id, itemSet: ChatItemSet): Compose => {
  const item = itemSet.previews.get(myId);
  const compose: Compose = {
    messageId: newId(),
    initialized: true,
    inputName: '',
    entities: [],
    sending: false,
    editFor: null,
    media: undefined,
    source: '',
    whisperTo: undefined,
    inGame: true,
    broadcast: true,
    isAction: false,
  };
  if (!item) {
    return compose;
  }
  const { preview } = item;
  if (preview.text === '' || preview.text === null || preview.channelId !== channelId) {
    return compose;
  }
  if (preview.editFor) {
    compose.messageId = preview.id;
    compose.editFor = preview.editFor;
  }
  compose.source = preview.text;
  compose.inGame = preview.inGame;
  if (compose.inGame && preview.name) {
    compose.inputName = preview.name;
  }
  return compose;
};

const handleComposeEditFailed = (state: ChatState, action: ComposeEditFailed): ChatState => {
  return state;
};

const handleComposeSendFailed = (state: ChatState, action: ComposeSendFailed): ChatState => {
  return state;
};

const handleResetComposeAfterSent = (state: ChatState, action: ResetComposeAfterSent): ChatState => {
  const compose: Compose = {
    ...state.compose,
    editFor: null,
    sending: false,
    isAction: false,
    source: '',
    media: undefined,
  };
  return { ...state, compose };
};

const handleCancelEdit = (state: ChatState, action: CancelEdit): ChatState => {
  const compose: Compose = {
    ...state.compose,
    editFor: null,
    messageId: newId(),
    source: '',
    inputName: '',
    media: undefined,
    whisperTo: null,
  };
  return { ...state, compose };
};

const handleComposeRestore = (state: ChatState, { compose }: RestoreComposeState): ChatState => {
  return { ...state, compose: { ...compose, messageId: newId() } };
};

const handleChannelEvent = (chat: ChatState, event: Events, myId: Id | undefined): ChatState => {
  const body = event.body;
  let { itemSet, channel, colorMap, members, eventAfter, initialized, compose } = chat;
  if (compareEvents(event.id, eventAfter) <= 0) {
    return chat;
  }
  if ('channelId' in body && body.channelId !== channel.id) {
    return chat;
  }
  switch (body.type) {
    case 'NEW_MESSAGE':
      itemSet = newMessage(itemSet, body.message, myId);
      break;
    case 'MESSAGE_PREVIEW':
      itemSet = newPreview(itemSet, body.preview, myId);
      break;
    case 'MESSAGE_DELETED':
      itemSet = handleMessageDelete(itemSet, body.messageId);
      break;
    case 'MESSAGES_MOVED':
      itemSet = handleMessagesMoved(itemSet, body.movedMessages, body.orderChanges, myId);
      break;
    case 'MESSAGE_EDITED':
      eventAfter = eventIdMax(eventAfter, event.id);
      chat = handleEditMessage(chat, body.message, myId);
      return { ...chat, eventAfter };
    case 'CHANNEL_EDITED':
      channel = body.channel;
      break;
    case 'MEMBERS':
      members = body.members;
      colorMap = updateColorMap(members, colorMap);
      break;
    case 'INITIALIZED':
      if (!initialized) {
        initialized = true;
        if (myId) {
          compose = handleChatInitialized(myId, channel.id, itemSet);
        }
      }
      break;
  }
  if (DEBUG) {
    checkMessagesOrder(itemSet);
  }
  eventAfter = eventIdMax(eventAfter, event.id);
  return {
    ...chat,
    channel,
    members,
    colorMap,
    itemSet,
    compose,
    initialized,
    eventAfter,
  };
};

export const handleMoveFinish = (state: ChatState, action: Action, myId?: Id): ChatState | undefined => {
  const actions = state.postponed;
  state = { ...state, postponed: List(), moving: false };
  return actions.reduce<ChatState | undefined>((state, action) => chatReducer(state, action, myId), state);
};

export const handleRevealMessage = (state: ChatState, message: Message, myId?: Id): ChatState => {
  return handleEditMessage(state, message, myId);
};

export const checkMessagesOrder = (itemSet: ChatItemSet) => {
  let prevPos = -1.0;
  for (const item of itemSet.messages) {
    if (item.pos <= prevPos) {
      console.warn('incorrect messages order');
    }
    prevPos = item.pos;
  }
};

const handleSpaceUpdate = (state: ChatState, spaceWithRelated: SpaceWithRelated): ChatState | undefined => {
  const { channels } = spaceWithRelated;
  const channel = channels.find((channel) => state.channel.id === channel.id);
  if (!channel) {
    return undefined;
  }
  const members = makeMembers(state.channel.id, spaceWithRelated.members, spaceWithRelated.channelMembers);

  return { ...state, channel, members };
};

export const chatReducer = (
  state: ChatState | undefined,
  action: Action,
  myId: Id | undefined,
): ChatState | undefined => {
  if (state === undefined) {
    return undefined;
  }

  if (DEBUG) {
    checkMessagesOrder(state.itemSet);
  }
  switch (action.type) {
    case 'SET_COMPOSE_SOURCE':
      return handleSetComposeSource(state, action);
    case 'SET_IS_ACTION':
      return handleSetIsAction(state, action);
    case 'SET_BROADCAST':
      return handleSetBroadcast(state, action);
    case 'SET_IN_GAME':
      return handleSetInGame(state, action);
    case 'ADD_DICE':
      return handleAddDice(state, action);
    case 'SET_INPUT_NAME':
      return handleSetInputName(state, action);
    case 'SET_COMPOSE_MEDIA':
      return handleSetComposeMedia(state, action);
    case 'SET_WHISPER_TO':
      return handleSetWhisperTo(state, action);
    case 'CANCEL_EDIT':
      return handleCancelEdit(state, action);
    case 'RESTORE_COMPOSE_STATE':
      return handleComposeRestore(state, action);
    case 'COMPOSE_SEND_FAILED':
      return handleComposeSendFailed(state, action);
    case 'COMPOSE_SENDING':
      return { ...state, compose: { ...state.compose, sending: true } };
    case 'COMPOSE_SENT':
      return { ...state, compose: { ...state.compose, sending: false } };
    case 'COMPOSE_EDIT_FAILED':
      return handleComposeEditFailed(state, action);
    case 'RESET_COMPOSE_AFTER_SENT':
      return handleResetComposeAfterSent(state, action);
    case 'FINISH_MOVE_MESSAGE':
      return handleMoveFinish(state, action, myId);
    case 'SPACE_UPDATED':
      return handleSpaceUpdate(state, action.spaceWithRelated);
    case 'SPACE_DELETED':
      if (state.channel.spaceId === action.spaceId) {
        return closeChat(state, state.channel.id);
      }
      break;
    case 'CHAT_UPDATE':
      return updateChat(state, action);
    case 'CLOSE_CHAT':
      return closeChat(state, action.id);
    case 'TOGGLE_SHOW_FOLDED':
      return { ...state, showFolded: !state.showFolded };
    case 'REVEAL_MESSAGE':
      return handleRevealMessage(state, action.message, myId);
    case 'LOAD_MESSAGES':
      return loadMessages(state, action, myId);
    case 'MOVING_MESSAGE':
      return handleMessageMoving(state, action);
    case 'START_MOVE_MESSAGE':
      return { ...state, moving: true };
    case 'RESET_MESSAGE_MOVING':
      return handleResetMessageMoving(state, action);
    case 'CHAT_FILTER':
      return { ...state, filter: action.filter };
    case 'START_EDIT_MESSAGE':
      return handleStartEditMessage(state, action);
    case 'STOP_EDIT_MESSAGE':
      return handleStopEditMessage(state, action);
    case 'EVENT_RECEIVED':
      return handleChannelEvent(state, action.event, myId);
  }
  return state;
};
