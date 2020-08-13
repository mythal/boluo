import { Channel, Member } from '@/api/channels';
import { Map } from 'immutable';
import { Message } from '@/api/messages';
import { Preview } from '@/api/events';
import { Action } from '@/actions';
import {
  ChannelEventReceived,
  ChatUpdate,
  CloseChat,
  LoadMessages,
  StartEditMessage,
  StopEditMessage,
} from '@/actions/chat';
import { DEBUG } from '@/settings';
import { Id } from '@/utils/id';
import { addItem, ChatItem, ChatItemSet, deleteMessage, editMessage, makeMessageItem } from '@/states/chat-item-set';

export interface ChatState {
  connection: WebSocket;
  channel: Channel;
  members: Member[];
  colorMap: Map<Id, string>;
  heartbeatMap: Map<Id, number>;
  itemSet: ChatItemSet;
  finished: boolean;
  messageBefore: number;
  eventAfter: number;
  initialized: boolean;
  filter: 'IN_GAME' | 'OUT_GAME' | 'NONE';
  memberList: boolean;
}

export const initChatState = undefined;

const loadChat = (prevState: ChatState | undefined, nextState: ChatState): ChatState => {
  if (!prevState) {
    return nextState;
  }
  if (prevState.colorMap.equals(nextState.colorMap)) {
    nextState.colorMap = prevState.colorMap;
  }
  if (prevState.channel.id === nextState.channel.id) {
    // reload
    const { channel, members, colorMap, connection } = nextState;
    return { ...prevState, channel, members, colorMap, connection };
  }
  return nextState;
};

const updateChat = (state: ChatState, { id, chat }: ChatUpdate): ChatState => {
  if (id !== state.channel.id) {
    return state;
  }
  return { ...state, ...chat };
};

export const closeChat = (state: ChatState, { id }: CloseChat): ChatState | undefined => {
  state.connection.onclose = null;
  state.connection.onerror = null;
  state.connection.onmessage = null;
  state.connection.onopen = null;
  return state.channel.id === id ? undefined : state;
};

const loadMessages = (chat: ChatState, { messages, finished }: LoadMessages, myId: Id | undefined): ChatState => {
  const len = messages.length;
  if (len === 0) {
    return { ...chat, finished };
  }
  const makeItem = makeMessageItem(myId);
  const itemSet: ChatItemSet = {
    ...chat.itemSet,
    messages: chat.itemSet.messages.unshift(...messages.map(makeItem)),
  };

  const messageBefore = Math.min(messages[len - 1].orderDate, chat.messageBefore);
  return { ...chat, messageBefore, finished, itemSet };
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
  if (preview.editFor) {
    item = {
      type: 'EDIT',
      id: preview.id,
      date: preview.start,
      mine: preview.senderId === myId,
      preview,
    };
  } else {
    item = {
      type: 'PREVIEW',
      id: preview.senderId,
      date: preview.start,
      mine: preview.senderId === myId,
      preview,
    };
  }
  return addItem(itemSet, item);
};

const newMessage = (
  itemSet: ChatItemSet,
  message: Message,
  messageBefore: number,
  eventAfter: number,
  initialized: boolean,
  finished: boolean,
  myId: Id | undefined
): ChatItemSet => {
  return addItem(itemSet, makeMessageItem(myId)(message));
};

const handleStartEditMessage = (state: ChatState, { message }: StartEditMessage): ChatState => {
  const itemSet = addItem(state.itemSet, {
    type: 'EDIT',
    id: message.id,
    mine: true,
    date: message.orderDate,
  });
  return { ...state, itemSet };
};

const handleStopEditMessage = (state: ChatState, { messageId }: StopEditMessage): ChatState => {
  const editions = state.itemSet.editions.remove(messageId);
  const itemSet = { ...state.itemSet, editions };
  return { ...state, itemSet };
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

const handleChannelEvent = (chat: ChatState, { event }: ChannelEventReceived, myId: Id | undefined): ChatState => {
  if (event.mailbox !== chat.channel.id) {
    return chat;
  }
  const body = event.body;
  let { itemSet, channel, colorMap, members, heartbeatMap, eventAfter, initialized } = chat;

  let messageBefore = chat.messageBefore;
  if (DEBUG) {
    console.log('Channel Event: ', body.type, body);
  }
  switch (body.type) {
    case 'NEW_MESSAGE':
      itemSet = newMessage(itemSet, body.message, messageBefore, eventAfter, initialized, chat.finished, myId);
      messageBefore = Math.min(body.message.orderDate, messageBefore);
      break;
    case 'MESSAGE_PREVIEW':
      itemSet = newPreview(itemSet, body.preview, myId);
      break;
    case 'MESSAGE_DELETED':
      itemSet = handleMessageDelete(itemSet, body.messageId);
      break;
    case 'MESSAGE_EDITED':
      itemSet = handleEditMessage(itemSet, body.message, myId);
      break;
    case 'CHANNEL_EDITED':
      if (channel.id === body.channel.id) {
        channel = body.channel;
      }
      break;
    case 'INITIALIZED':
      initialized = true;
      break;
    case 'MEMBERS':
      members = body.members;
      colorMap = updateColorMap(members, colorMap);
      break;
    case 'HEARTBEAT_MAP':
      heartbeatMap = Map(body.heartbeatMap);
      break;
  }
  eventAfter = event.timestamp;
  return {
    ...chat,
    channel,
    members,
    colorMap,
    itemSet,
    eventAfter,
    messageBefore,
    heartbeatMap,
    initialized,
  };
};

export const chatReducer = (
  state: ChatState | undefined,
  action: Action,
  myId: Id | undefined
): ChatState | undefined => {
  if (action.type === 'CHAT_LOADED') {
    return loadChat(state, action.chat);
  }
  if (state === undefined) {
    return undefined;
  }
  switch (action.type) {
    case 'CHAT_UPDATE':
      return updateChat(state, action);
    case 'CLOSE_CHAT':
      return closeChat(state, action);
    case 'LOAD_MESSAGES':
      return loadMessages(state, action, myId);
    case 'CHAT_FILTER':
      return { ...state, filter: action.filter };
    case 'TOGGLE_MEMBER_LIST':
      return { ...state, memberList: !state.memberList };
    case 'START_EDIT_MESSAGE':
      return handleStartEditMessage(state, action);
    case 'STOP_EDIT_MESSAGE':
      return handleStopEditMessage(state, action);
    case 'CHANNEL_EVENT_RECEIVED':
      return handleChannelEvent(state, action, myId);
  }
  return state;
};
