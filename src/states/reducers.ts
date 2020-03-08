import { State } from './states';
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
import {
  addMessageToItemMap,
  addPreviewToItemMap,
  Chat,
  ChatItem,
  findItem,
  ItemMap,
  newEmptyItem,
  newMessageChatItem,
  newPreviewChatItem,
  queryMessageEntry,
  queryPreviewEntry,
} from './chat';

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
  let { itemList, itemMap } = chat;

  for (const message of messages) {
    if (itemMap.has(message.id)) {
      continue;
    }
    itemList = itemList.push(newMessageChatItem(message));
    itemMap = addMessageToItemMap(itemMap, message);
  }

  itemList = itemList
    .filter(item => item.type !== 'EMPTY')
    .sort((a, b) => {
      if (a.date > b.date) {
        return -1;
      } else if (a.date < b.date) {
        return 1;
      } else {
        return 0;
      }
    });
  const messageBefore = Math.min(messages[len - 1].orderDate, chat.messageBefore);
  const eventAfter = itemList.first(undefined)?.date.getTime() ?? chat.eventAfter;
  return { ...state, chat: { ...chat, messageBefore, itemList, itemMap, finished, eventAfter } };
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
    const itemList: Chat['itemList'] = List();
    const itemMap: Chat['itemMap'] = Map();
    const messageBefore = new Date().getTime();
    const eventAfter = messageBefore - 24 * 60 * 60 * 1000;
    const finished = false;
    const chat: Chat = { channel, members, colorMap, itemList, itemMap, messageBefore, finished, eventAfter };
    return { ...state, chat };
  }
};

const editMessage = (itemList: List<ChatItem>, itemMap: ItemMap, message: Message): List<ChatItem> => {
  const itemInfo = itemMap.get(message.id);
  if (itemInfo === undefined) {
    return itemList;
  }
  const { type, date } = itemInfo;
  if (type === 'PREVIEW') {
    console.warn('attempt edit a preview item');
    return itemList;
  }
  const [index] = findItem(itemList, date, message.id);
  return itemList.set(index, newMessageChatItem(message));
};

const deleteMessage = (itemList: List<ChatItem>, itemMap: ItemMap, messageId: Id): [List<ChatItem>, ItemMap] => {
  const itemInfo = itemMap.get(messageId);
  if (itemInfo === undefined) {
    return [itemList, itemMap];
  }
  const { type, date } = itemInfo;
  if (type === 'PREVIEW') {
    console.warn('attempt edit a preview item');
    return [itemList, itemMap];
  }
  const [index, item] = findItem(itemList, date, messageId);
  if (item.type !== 'MESSAGE') {
    console.warn('failed to find item');
    return [itemList, itemMap];
  }
  return [itemList.set(index, newEmptyItem(item.date)), itemMap.remove(messageId)];
};

const newPreview = (itemList: List<ChatItem>, itemMap: ItemMap, preview: Preview): [List<ChatItem>, ItemMap] => {
  const messageInfo = queryMessageEntry(itemMap, preview.id);
  if (messageInfo !== undefined) {
    // There is already a message with the same id.
    console.warn('preview after the message');
    return [itemList, itemMap];
  }

  const previousPreviewEntry = queryPreviewEntry(itemMap, preview.senderId);
  if (previousPreviewEntry !== undefined) {
    // Users have sent previews.
    const { id, date } = previousPreviewEntry;
    const [index] = findItem(itemList, date, id);
    if (id === preview.id) {
      // same id, replace it.
      itemList = itemList.set(index, newPreviewChatItem(preview));
      return [itemList, itemMap];
    } else {
      // different id, delete it.
      itemList = itemList.set(index, newEmptyItem(date));
    }
  }

  itemMap = addPreviewToItemMap(itemMap, preview);
  const previewItem = newPreviewChatItem(preview);
  const startDate = previewItem.date;

  let i = 0;
  for (const item of itemList) {
    if (item.date < startDate) {
      return [i === 0 ? itemList.unshift(previewItem) : itemList.insert(i, previewItem), itemMap];
    }
    i += 1;
  }
  return [itemList.push(previewItem), itemMap];
};

const newMessage = (
  itemList: List<ChatItem>,
  itemMap: ItemMap,
  message: Message,
  messageBefore: number,
  eventAfter: number
): [List<ChatItem>, ItemMap] => {
  const messageItem = newMessageChatItem(message);
  const messageDate = messageItem.date;
  const previousPreview = queryPreviewEntry(itemMap, message.senderId);

  // new message ordered before oldest message.
  if (message.orderDate < Math.min(messageBefore, eventAfter)) {
    if (previousPreview === undefined) {
      return [itemList, itemMap];
    }
    // delete preview.
    itemMap = itemMap.remove(message.senderId);
    const [index] = findItem(itemList, previousPreview.date, previousPreview.id);
    itemList = itemList.set(index, newEmptyItem(previousPreview.date));
    return [itemList, itemMap];
  }

  // Users have sent previews.
  if (previousPreview !== undefined) {
    const { id, date } = previousPreview;
    const [index] = findItem(itemList, date, id);
    itemMap = itemMap.remove(message.senderId);

    if (id === message.id) {
      // same id, replace it.
      itemList = itemList.set(index, messageItem);
      itemMap = addMessageToItemMap(itemMap, message);
      return [itemList, itemMap];
    } else {
      // different id, delete it.
      itemList = itemList.set(index, newEmptyItem(date));
    }
  }

  const previousMessage = itemMap.get(message.id);
  if (previousMessage !== undefined) {
    console.warn('duplicate message.');
    return [itemList, itemMap];
  }
  itemMap = addMessageToItemMap(itemMap, message);
  let i = 0;
  for (const item of itemList) {
    if (item.date < messageDate) {
      return [i === 0 ? itemList.unshift(messageItem) : itemList.insert(i, messageItem), itemMap];
    }
    i += 1;
  }
  return [itemList.push(messageItem), itemMap];
};

const handleChannelEvent: Reducer<ChannelEventReceived> = (state, { event }) => {
  const { chat } = state;
  if (chat === undefined || event.mailbox !== chat.channel.id) {
    return state;
  }
  const body = event.body;
  let { itemList, itemMap } = chat;

  let messageBefore = chat.messageBefore;
  const eventAfter = event.timestamp;
  switch (body.type) {
    case 'newMessage':
      [itemList, itemMap] = newMessage(itemList, itemMap, body.message, messageBefore, eventAfter);
      messageBefore = Math.min(body.message.orderDate, messageBefore);
      break;
    case 'messagePreview':
      [itemList, itemMap] = newPreview(itemList, itemMap, body.preview);
      break;
    case 'messageDeleted':
      [itemList, itemMap] = deleteMessage(itemList, itemMap, body.messageId);
      break;
    case 'messageEdited':
      itemList = editMessage(itemList, itemMap, body.message);
      break;
  }
  return { ...state, chat: { ...chat, itemList, itemMap, eventAfter, messageBefore } };
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
