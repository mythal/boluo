import { Channel, ChannelMember } from '../api/channels';
import { List, Map } from 'immutable';
import { Id } from '../id';
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
  id: undefined;
}

export type ChatItem = MessageChatItem | PreviewChatItem | DayDividerChatItem;

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

export const newDayDivider = (date: Date): DayDividerChatItem => ({ type: 'DAY_DIVIDER', date, id: undefined });

export interface Chat {
  channel: Channel;
  members: ChannelMember[];
  colorMap: Map<Id, string>;
  itemList: List<ChatItem>;
  previewMap: Map<Id, Id>;
  finished: boolean;
  oldest: number;
  latest: number;
}
