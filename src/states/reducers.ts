import { Chat, ChatItem, newDayDivider, State } from './states';
import {
  Action,
  ChannelEventReceived,
  ChannelMemberEdited,
  CloseChat,
  JoinedChannel,
  JoinedSpace,
  LeftChannel,
  LeftSpace,
  LoadChat,
  LoadMessages,
  LoggedIn,
  NewAlert,
  SpaceEdited,
} from './actions';
import { List, Map, OrderedMap } from 'immutable';
import { ChannelWithMember } from '../api/channels';
import { Id } from '../id';
import { SpaceWithMember } from '../api/spaces';
import { Message, Preview } from '../api/messages';

type Reducer<T extends Action = Action> = (state: State, action: T) => State;

const login: Reducer<LoggedIn> = (state, action) => {
  const profile = action.user;
  let spaces: OrderedMap<Id, SpaceWithMember> = OrderedMap();
  let channels: OrderedMap<Id, ChannelWithMember> = OrderedMap();
  for (const s of action.mySpaces) {
    spaces = spaces.set(s.space.id, s);
  }
  for (const c of action.myChannels) {
    channels = channels.set(c.channel.id, c);
  }

  return { ...state, my: { profile, channels, spaces } };
};

const logout: Reducer = state => {
  return {
    ...state,
    my: 'GUEST',
  };
};

const joinSpace: Reducer<JoinedSpace> = (state, { space, member }) => {
  const { my } = state;
  if (my === 'GUEST') {
    return state;
  }
  const spaces = my.spaces.set(space.id, { space, member });
  return { ...state, my: { ...my, spaces } };
};

const editSpace: Reducer<SpaceEdited> = (state, { space }) => {
  const { my } = state;
  if (my === 'GUEST') {
    return state;
  }
  const member = my.spaces.get(space.id)?.member;
  if (!member) {
    return state;
  }
  const spaces = my.spaces.set(space.id, { space, member });
  return { ...state, my: { ...my, spaces } };
};

const leaveSpace: Reducer<LeftSpace> = (state, { id }) => {
  const { my } = state;
  if (my === 'GUEST') {
    return state;
  }
  const spaces = my.spaces.remove(id);
  return { ...state, my: { ...my, spaces } };
};

const joinChannel: Reducer<JoinedChannel> = (state, { channel, member }) => {
  const { my } = state;
  if (my === 'GUEST') {
    return state;
  }
  const channels = my.channels.set(channel.id, { channel, member });
  return { ...state, my: { ...my, channels } };
};

const leaveChannel: Reducer<LeftChannel> = (state, { id }) => {
  const { my } = state;
  if (my === 'GUEST') {
    return state;
  }
  const channels = my.channels.remove(id);
  return { ...state, my: { ...my, channels } };
};

const editChannelMember: Reducer<ChannelMemberEdited> = (state, { channelId, member }) => {
  const { my } = state;
  if (my === 'GUEST') {
    return state;
  }
  const channel = my.channels.get(channelId)?.channel;
  if (!channel) {
    return state;
  }
  const channels = my.channels.set(channelId, { channel, member });
  let chat = state.chat;
  if (chat?.channel.id === member.channelId) {
    let { colorMap } = chat;
    const color = colorMap.get(member.userId);
    if (member.textColor && color !== member.textColor) {
      colorMap = colorMap.set(member.userId, member.textColor);
      chat = { ...chat, colorMap };
    }
  }
  return { ...state, chat, my: { ...my, channels } };
};

const toggleSidebar: Reducer = state => {
  const { appearance } = state;
  const sidebar = !appearance.sidebar;
  return { ...state, appearance: { ...appearance, sidebar } };
};

const newAlert: Reducer<NewAlert> = (state, { level, message }) => {
  let { alertList } = state;
  const created = new Date().getTime();
  alertList = alertList.push({ level, message, created });
  return { ...state, alertList };
};

const loadMessages: Reducer<LoadMessages> = (state, { messages, finished }) => {
  const { chat } = state;
  const len = messages.length;
  if (chat === undefined) {
    return state;
  } else if (len === 0) {
    return { ...state, chat: { ...chat, finished } };
  }
  let { itemList } = chat;
  let messageDate = new Date(messages[0].orderDate);
  for (const message of messages) {
    const date = new Date(message.orderDate);
    if (date.getDay() !== messageDate.getDay()) {
      itemList = itemList.push({ type: 'DAY_DIVIDER', date });
    }
    itemList = itemList.push({ type: 'MESSAGE', message, date });
    messageDate = date;
  }
  if (finished) {
    itemList = itemList.push({ type: 'DAY_DIVIDER', date: messageDate });
  }
  const oldest = Math.min(messageDate.getTime(), chat.oldest);
  const latest = Math.max(messages[0].orderDate, chat.latest);
  return { ...state, chat: { ...chat, oldest, itemList, finished, latest } };
};

const loadChat: Reducer<LoadChat> = (state, { channelWithRelated }) => {
  const { channel, members, colorList } = channelWithRelated;
  let colorMap = Map<Id, string>(Object.entries(colorList));
  if (state.chat && state.chat.colorMap.equals(colorMap)) {
    colorMap = state.chat.colorMap;
  }
  if (state.chat?.channel.id === channel.id) {
    // reload
    const chat: Chat = { ...state.chat, channel, members, colorMap };
    return { ...state, chat };
  } else {
    const itemList = List<ChatItem>();
    const previewMap = Map<Id, Id>();
    const oldest = new Date().getTime();
    const latest = oldest;
    const finished = false;
    const chat: Chat = { channel, members, colorMap, itemList, previewMap, oldest, finished, latest };
    return { ...state, chat };
  }
};

const editMessage = (itemList: List<ChatItem>, message: Message): List<ChatItem> => {
  const index = itemList.findIndex(item => item.type === 'MESSAGE' && item.message.id === message.id);
  if (index === -1) {
    return itemList;
  }
  const date = new Date(message.orderDate);
  return itemList.set(index, { type: 'MESSAGE', message, date });
};

const deleteMessage = (itemList: List<ChatItem>, messageId: Id): List<ChatItem> => {
  const index = itemList.findIndex(item => item.type === 'MESSAGE' && item.message.id === messageId);
  if (index === -1) {
    return itemList;
  }
  const item = itemList.get(index);
  if (item?.type !== 'MESSAGE') {
    return itemList;
  }
  const message = item.message;
  const date = item.date;
  const next: ChatItem = { type: 'MESSAGE', message: { ...message, deleted: true }, date };
  return itemList.set(index, next);
};

const newPreview = (
  itemList: List<ChatItem>,
  previewMap: Map<Id, Id>,
  preview: Preview,
  prevDate: Date
): [List<ChatItem>, Map<Id, Id>] => {
  const date = new Date(preview.start);
  const previewItem: ChatItem = { type: 'PREVIEW', preview, date };

  const previewDate = new Date(preview.start);
  const firstItem = itemList.first(undefined);
  const nextPreviewMap = previewMap.set(preview.senderId, preview.id);
  if (firstItem === undefined || firstItem.date < previewDate) {
    if (prevDate.getDate() !== date.getDate()) {
      itemList = itemList.unshift(newDayDivider(date));
    }
    itemList = itemList.unshift(previewItem);
    return [itemList, nextPreviewMap];
  }
  let i = 0;
  for (const item of itemList) {
    if (item.type === 'PREVIEW' && item.preview.id === preview.id) {
      return [itemList.set(i, previewItem), nextPreviewMap];
    } else if (item.date < previewDate) {
      return [itemList.insert(i, previewItem), nextPreviewMap];
    } else if (item.type === 'MESSAGE' && item.message.id === preview.id) {
      return [itemList, previewMap];
    }
    i += 1;
  }
  return [itemList.push(previewItem), nextPreviewMap];
};

const newMessage = (itemList: List<ChatItem>, message: Message, prevDate: Date): List<ChatItem> => {
  const date = new Date(message.orderDate);
  const firstDate = itemList.first(undefined)?.date;
  const messageItem: ChatItem = { type: 'MESSAGE', message, date: date };
  if (firstDate === undefined || firstDate < date) {
    if (prevDate.getDate() !== date.getDate()) {
      itemList = itemList.unshift(newDayDivider(date));
    }
    itemList = itemList.unshift(messageItem);
    return itemList;
  }

  let i = 0;
  for (const item of itemList) {
    if (item.type === 'PREVIEW' && item.preview.id === message.id) {
      return itemList.set(i, messageItem);
    } else if (item.date < date) {
      return itemList.insert(i, messageItem);
    } else if (item.type === 'MESSAGE' && item.message.id === message.id) {
      return itemList;
    }
    i += 1;
  }
  return itemList.push(messageItem);
};

const handleChannelEvent: Reducer<ChannelEventReceived> = (state, { event }) => {
  const { chat } = state;
  if (chat === undefined || event.mailbox !== chat.channel.id) {
    return state;
  }
  const body = event.body;
  let { itemList, previewMap } = chat;

  let oldest = chat.oldest;
  const prevDate = new Date(chat.latest);
  switch (body.type) {
    case 'newMessage':
      itemList = newMessage(itemList, body.message, prevDate);
      previewMap = previewMap.remove(body.message.id);
      oldest = Math.min(body.message.orderDate, oldest);
      break;
    case 'messagePreview':
      [itemList, previewMap] = newPreview(itemList, previewMap, body.preview, prevDate);
      break;
    case 'messageDeleted':
      itemList = deleteMessage(itemList, body.messageId);
      previewMap = previewMap.remove(body.messageId);
      break;
    case 'messageEdited':
      itemList = editMessage(itemList, body.message);
      previewMap = previewMap.remove(body.message.id);
      break;
  }
  const latest = event.timestamp;
  return { ...state, chat: { ...chat, itemList, previewMap, latest, oldest } };
};

const closeChat: Reducer<CloseChat> = (state, { id }) => {
  const { chat } = state;
  if (chat === undefined || chat.channel.id !== id) {
    return state;
  }
  if (state.chat?.channel.id === id) {
    return { ...state, chat: undefined };
  } else {
    return state;
  }
};

export const reducer = (state: State, action: Action) => {
  console.log(action);
  switch (action.type) {
    case 'LOGGED_IN':
      return login(state, action);
    case 'LOGGED_OUT':
      return logout(state, action);
    case 'TOGGLE_SIDEBAR':
      return toggleSidebar(state, action);
    case 'JOINED_SPACE':
      return joinSpace(state, action);
    case 'LEFT_SPACE':
      return leaveSpace(state, action);
    case 'SPACE_EDITED':
      return editSpace(state, action);
    case 'CHANNEL_MEMBER_EDITED':
      return editChannelMember(state, action);
    case 'JOINED_CHANNEL':
      return joinChannel(state, action);
    case 'LEFT_CHANNEL':
      return leaveChannel(state, action);
    case 'NEW_ALERT':
      return newAlert(state, action);
    case 'LOAD_CHAT':
      return loadChat(state, action);
    case 'CHANNEL_EVENT_RECEIVED':
      return handleChannelEvent(state, action);
    case 'LOAD_MESSAGES':
      return loadMessages(state, action);
    case 'CLOSE_CHAT':
      return closeChat(state, action);
  }
};
