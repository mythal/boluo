import { Id } from '@/utils/id';
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
  messages: List<MessageItem | PreviewItem>;
  previews: Map<Id, PreviewItem>;
  editions: Map<Id, EditItem>;
}

export const initialChatItemSet: ChatItemSet = {
  messages: List(),
  previews: Map(),
  editions: Map(),
};

const insertItem = (messages: ChatItemSet['messages'], newItem: MessageItem | PreviewItem): ChatItemSet['messages'] => {
  const index = messages.findLastIndex((item) => item.date < newItem.date);
  return messages.insert(index + 1, newItem);
};

const removeItem = (messages: ChatItemSet['messages'], id: Id): ChatItemSet['messages'] => {
  const index = messages.findLastIndex((item) => item.id === id);
  if (index !== -1) {
    return messages.remove(index);
  } else {
    return messages;
  }
};

export const addItem = ({ messages, previews, editions }: ChatItemSet, item: ChatItem): ChatItemSet => {
  if (item.type === 'MESSAGE') {
    messages = insertItem(messages, item);
    const previewItem = previews.get(item.message.senderId);
    if (previewItem && previewItem.date <= item.date) {
      previews = previews.remove(item.message.senderId);
      messages = removeItem(messages, item.message.senderId);
    }
  } else if (item.type === 'PREVIEW') {
    const hasPrevPreview = previews.has(item.id);
    if (hasPrevPreview) {
      messages = removeItem(messages, item.id);
    }
    if (!item.mine && item.preview.text === '') {
      previews = previews.remove(item.id);
    } else {
      previews = previews.set(item.id, item);
      messages = insertItem(messages, item);
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

export const editMessage = (itemSet: ChatItemSet, editedItem: MessageItem): ChatItemSet => {
  let { messages } = itemSet;
  const editions = itemSet.editions.remove(editedItem.id);
  const index = messages.findLastIndex((item) => item.id === editedItem.id);
  if (index === -1) {
    return { ...itemSet, editions };
  }
  const target = messages.get(index)!;
  if (target.date === editedItem.date) {
    messages = messages.set(index, editedItem);
  } else {
    messages = insertItem(messages.remove(index), editedItem);
  }
  return { ...itemSet, editions, messages };
};
