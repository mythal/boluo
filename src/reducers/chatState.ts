import { Channel, ChannelMember, makeMembers, Member } from '../api/channels';
import { List, Map } from 'immutable';
import { Message, MessageOrder } from '../api/messages';
import { Events, Preview } from '../api/events';
import { Action } from '../actions';
import {
  ChatLoaded,
  ChatUpdate,
  LoadMessages,
  MovingMessage,
  ResetMessageMoving,
  StartEditMessage,
  StopEditMessage,
} from '../actions/chat';
import { DEBUG } from '../settings';
import { Id } from '../utils/id';
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
import Prando from 'prando';
import { SpaceMemberWithUser, SpaceWithRelated } from '../api/spaces';
import * as O from 'optics-ts';
import { AppResult } from 'api/request';

export interface ChatState {
  channel: Channel;
  members: Member[];
  colorMap: Map<Id, string>;
  initialized: boolean;
  // heartbeatMap: Map<Id, number>;
  itemSet: ChatItemSet;
  finished: boolean;
  eventAfter: number;
  lastLoadBefore: number;
  filter: 'IN_GAME' | 'OUT_GAME' | 'NONE';
  showFolded: boolean;
  moving: boolean;
  postponed: List<Action>;
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

const handleEditMessage = (itemSet: ChatItemSet, message: Message, myId: Id | undefined): ChatItemSet => {
  const item = makeMessageItem(myId)(message);
  return editMessage(itemSet, item);
};

const handleMessageDelete = (itemSet: ChatItemSet, messageId: Id): ChatItemSet => {
  return deleteMessage(itemSet, messageId);
};

const newPreview = (itemSet: ChatItemSet, preview: Preview, myId: Id | undefined): ChatItemSet => {
  let item: ChatItem;
  const rng = new Prando(preview.id);
  const offset = rng.nextInt(-65526, 65526);
  if (preview.editFor) {
    item = {
      type: 'EDIT',
      id: preview.id,
      mine: preview.senderId === myId,
      preview,
      pos: preview.pos,
    };
  } else {
    item = {
      type: 'PREVIEW',
      id: preview.senderId,
      mine: preview.senderId === myId,
      pos: preview.pos,
      preview,
    };
  }
  return addItem(itemSet, item);
};

const newMessage = (itemSet: ChatItemSet, message: Message, myId: Id | undefined): ChatItemSet => {
  return addItem(itemSet, makeMessageItem(myId)(message));
};

const handleStartEditMessage = (state: ChatState, { message }: StartEditMessage): ChatState => {
  const itemSet = addItem(state.itemSet, {
    type: 'EDIT',
    id: message.id,
    mine: true,
    pos: message.pos,
  });
  return O.set(focusItemSet)(itemSet)(state);
};

const modifyEditions = O.modify(focusItemSet.prop('editions'));
const handleStopEditMessage = (state: ChatState, { messageId }: StopEditMessage): ChatState => {
  return modifyEditions((editions) => editions.remove(messageId))(state);
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
  myId?: Id
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

const handleChannelEvent = (chat: ChatState, event: Events, myId: Id | undefined): ChatState => {
  const body = event.body;
  let { itemSet, channel, colorMap, members, eventAfter, initialized } = chat;
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
      itemSet = handleEditMessage(itemSet, body.message, myId);
      break;
    case 'CHANNEL_EDITED':
      channel = body.channel;
      break;
    case 'MEMBERS':
      members = body.members;
      colorMap = updateColorMap(members, colorMap);
      break;
    case 'INITIALIZED':
      initialized = true;
      break;
  }
  if (DEBUG) {
    checkMessagesOrder(itemSet);
  }
  eventAfter = Math.max(eventAfter, event.timestamp);
  return {
    ...chat,
    channel,
    members,
    colorMap,
    itemSet,
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
  const itemSet = handleEditMessage(state.itemSet, message, myId);
  return { ...state, itemSet };
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
  myId: Id | undefined
): ChatState | undefined => {
  if (state === undefined) {
    return undefined;
  }

  if (DEBUG) {
    checkMessagesOrder(state.itemSet);
  }
  switch (action.type) {
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
