import { Id, newId } from '@/utils/id';
import { Message } from '@/api/messages';
import { Preview } from '@/api/events';
import { List, Map } from 'immutable';

export interface ChatNode {
  id: Id;
  date: number;
  mine: boolean;
}

export interface MessageItem extends ChatNode {
  type: 'MESSAGE';
  message: Message;
}

export const makeMessageItem = (myId?: Id) => (message: Message): MessageItem => ({
  id: message.id,
  date: message.orderDate,
  mine: message.senderId === myId,
  type: 'MESSAGE',
  message,
});

export interface PreviewItem extends ChatNode {
  type: 'PREVIEW';
  preview: Preview;
}

export interface EditItem extends ChatNode {
  type: 'EDIT';
  preview?: Preview;
}

export type ChatItem = MessageItem | PreviewItem | EditItem;

export interface ChatItemSet {
  messages: List<MessageItem>;
  previews: Map<Id, PreviewItem>;
  editions: Map<Id, EditItem>;
}

export const initialChatItemSet: ChatItemSet = {
  messages: List(),
  previews: Map(),
  editions: Map(),
};

const insertMessage = (messages: List<MessageItem>, newItem: MessageItem): List<MessageItem> => {
  const index = messages.findLastIndex((item) => item.date < newItem.date);
  return messages.insert(index + 1, newItem);
};

export const addItem = ({ messages, previews, editions }: ChatItemSet, item: ChatItem): ChatItemSet => {
  if (item.type === 'MESSAGE') {
    messages = insertMessage(messages, item);
    const previewItem = previews.get(item.message.senderId);
    if (previewItem && previewItem.date <= item.date) {
      const { preview, mine, type } = previewItem;
      if (mine) {
        const now = new Date().getTime();
        const nextPreview: Preview = {
          ...preview,
          id: newId(),
          parentMessageId: null,
          mediaId: null,
          text: '',
          whisperToUsers: null,
          entities: [],
          start: now,
          editFor: null,
        };
        const nextItem: PreviewItem = {
          preview: nextPreview,
          mine: true,
          type,
          id: preview.senderId,
          date: now,
        };
        previews = previews.set(preview.senderId, nextItem);
      } else {
        previews = previews.remove(item.message.senderId);
      }
    }
  } else if (item.type === 'PREVIEW') {
    if (!item.mine && item.preview.text === '') {
      previews = previews.remove(item.id);
    } else {
      previews = previews.set(item.id, item);
    }
  } else if (item.type === 'EDIT') {
    if (!item.mine && item.preview?.text === '') {
      editions = editions.remove(item.id);
    } else {
      editions = editions.set(item.id, item);
    }
  }

  return { messages, previews, editions };
};

export const deleteMessage = (itemSet: ChatItemSet, messageId: Id): ChatItemSet => {
  const index = itemSet.messages.findLastIndex((item) => item.id === messageId);
  if (index === -1) {
    return itemSet;
  }
  const messages = itemSet.messages.remove(index);
  return { ...itemSet, messages };
};

export const editMessage = (itemSet: ChatItemSet, editItem: MessageItem): ChatItemSet => {
  const index = itemSet.messages.findLastIndex((item) => item.id === editItem.id);
  const editions = itemSet.editions.remove(editItem.id);
  if (index === -1) {
    return { ...itemSet, editions };
  }
  let { messages } = itemSet;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const target = messages.get(index)!;
  if (target.date === editItem.date) {
    messages = messages.set(index, editItem);
  } else {
    messages = insertMessage(messages.remove(index), editItem);
  }
  return { ...itemSet, editions, messages };
};
