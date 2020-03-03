import { Channel, ChannelMember } from '../api/channels';
import { List, Map } from 'immutable';
import { Id, newId } from '../id';
import { Message, Preview } from '../api/messages';

export interface MessageChatItem {
  id: Id;
  type: 'MESSAGE';
  message: Message;
  date: Date;
}

export interface PreviewChatItem {
  type: 'PREVIEW';
  preview: Preview;
  date: Date;
  id: Id;
}

export interface DayDividerChatItem {
  type: 'DAY_DIVIDER';
  date: Date;
  id: Id;
}

export interface EmptyItem {
  type: 'EMPTY';
  date: Date;
  id: Id;
}

export type ChatItem = MessageChatItem | PreviewChatItem | DayDividerChatItem | EmptyItem;

export const newPreviewChatItem = (preview: Preview): PreviewChatItem => ({
  type: 'PREVIEW',
  preview,
  date: new Date(preview.start),
  id: preview.id,
});

export const newMessageChatItem = (message: Message): MessageChatItem => ({
  type: 'MESSAGE',
  date: new Date(message.orderDate),
  id: message.id,
  message,
});

export const newDayDivider = (date: Date): DayDividerChatItem => ({ type: 'DAY_DIVIDER', date, id: newId() });

export const newEmptyItem = (date: Date): EmptyItem => ({ type: 'EMPTY', date, id: newId() });

export interface PreviewEntry {
  type: 'PREVIEW';
  date: Date;
  id: Id;
}

export interface MessageEntry {
  type: 'MESSAGE';
  date: Date;
}

export type ItemMap = Map<Id, PreviewEntry | MessageEntry>;

export interface Chat {
  channel: Channel;
  members: ChannelMember[];
  colorMap: Map<Id, string>;
  itemList: List<ChatItem>;
  itemMap: ItemMap;
  finished: boolean;
  oldest: number;
  latest: number;
}

export const addMessageToItemMap = (itemMap: ItemMap, message: Message): ItemMap =>
  itemMap.set(message.id, { type: 'MESSAGE', date: new Date(message.orderDate) });

export const addPreviewToItemMap = (itemMap: ItemMap, preview: Preview): ItemMap =>
  itemMap.set(preview.senderId, { type: 'PREVIEW', date: new Date(preview.start), id: preview.id });

export const findItem = (itemList: List<ChatItem>, date: Date, id: Id): [number, ChatItem] => {
  let i = 0;
  for (const item of itemList) {
    if (item.id === id) {
      return [i, item];
    } else if (item.date < date) {
      throw new Error('failed to find item');
    }
    i += 1;
  }
  throw new Error('failed to find item');
};
