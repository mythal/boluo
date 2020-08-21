import { Id, newId } from '../utils/id';
import { Message, MessageOrder } from '../api/messages';
import { Preview } from '../api/events';
import { List, Map } from 'immutable';

export interface ChatNode {
  id: Id;
  date: number;
  offset: number;
  mine: boolean;
}

export interface MessageItem extends ChatNode {
  type: 'MESSAGE';
  message: Message;
  moving?: boolean;
}

export const makeMessageItem = (myId?: Id) => (message: Message): MessageItem => ({
  id: message.id,
  date: message.orderDate,
  offset: message.orderOffset,
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
  const index = messages.findLastIndex((item) => {
    if (item.date < newItem.date) {
      return true;
    } else if (item.date === newItem.date) {
      return item.offset < newItem.offset;
    } else {
      return false;
    }
  });
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

const dummyPreview = ({ senderId, mailbox, mailboxType, name, inGame, isAction, isMaster }: Preview): PreviewItem => {
  const now = new Date().getTime();

  const preview: Preview = {
    id: newId(),
    mailbox,
    mailboxType,
    name,
    inGame,
    isAction,
    isMaster,
    parentMessageId: null,
    mediaId: null,
    text: '',
    whisperToUsers: null,
    entities: [],
    start: now,
    editFor: null,
    senderId,
  };
  return {
    type: 'PREVIEW',
    preview,
    date: now,
    mine: true,
    id: senderId,
    offset: 0,
  };
};

export const addItem = ({ messages, previews, editions }: ChatItemSet, item: ChatItem): ChatItemSet => {
  if (item.type === 'MESSAGE') {
    messages = insertItem(messages, item);
    const previewItem = previews.get(item.message.senderId);
    if (previewItem && previewItem.date <= item.date) {
      if (previewItem.date === item.date && previewItem.preview.id === item.message.id && previewItem.mine) {
        const newPreviewItem = dummyPreview(previewItem.preview);
        previews = previews.set(newPreviewItem.id, newPreviewItem);
        messages = removeItem(messages, item.message.senderId).push(newPreviewItem);
      } else {
        previews = previews.remove(item.message.senderId);
        messages = removeItem(messages, item.message.senderId);
      }
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

export const updateMessagesOrder = (itemSet: ChatItemSet, orderChanges: MessageOrder[]): ChatItemSet => {
  return orderChanges.reduce((itemSet, change) => {
    const index = itemSet.messages.findLastIndex((item) => item.id === change.id);
    if (index === -1) {
      return itemSet;
    } else {
      const messages = itemSet.messages.update(index, (item) => {
        if (item.type !== 'MESSAGE') {
          return { ...item, date: change.orderDate, offset: change.orderOffset };
        } else {
          const message: Message = { ...item.message, ...change };
          return { ...item, message, date: change.orderDate, offset: change.orderOffset };
        }
      });
      return { ...itemSet, messages };
    }
  }, itemSet);
};

export const editMessage = (itemSet: ChatItemSet, editedItem: MessageItem, messageBefore: number): ChatItemSet => {
  let { messages } = itemSet;
  const editions = itemSet.editions.remove(editedItem.id);
  const index = messages.findLastIndex((item) => item.id === editedItem.id);
  if (index === -1) {
    if (editedItem.date < messageBefore) {
      return { ...itemSet, editions };
    } else {
      return addItem(itemSet, editedItem);
    }
  }
  const target = messages.get(index);
  if (target === undefined || target.type !== 'MESSAGE') {
    throw new Error('unexpected item type');
  }
  if (editedItem.date < messageBefore) {
    messages = messages.remove(index);
  } else if (
    target.message.orderDate === editedItem.message.orderDate &&
    target.message.orderOffset === editedItem.message.orderOffset
  ) {
    messages = messages.set(index, editedItem);
  } else {
    messages = insertItem(messages.remove(index), editedItem);
  }
  return { ...itemSet, editions, messages };
};

export const markMessageMoving = (itemSet: ChatItemSet, index: number, insertToIndex: number): ChatItemSet => {
  const messageItem = itemSet.messages.get(index);
  if (messageItem === undefined || messageItem.type !== 'MESSAGE') {
    console.warn("can't found item to move");
    return itemSet;
  }
  if (insertToIndex >= itemSet.messages.size) {
    const lastItem: PreviewItem | MessageItem | undefined = itemSet.messages.last();
    if (lastItem === undefined) {
      return itemSet;
    }
    const newMessageItem: MessageItem = {
      ...messageItem,
      moving: true,
      date: lastItem.date,
      offset: lastItem.offset + 1,
    };
    const messages = itemSet.messages.remove(index).push(newMessageItem);
    return { ...itemSet, messages };
  }
  const targetItem = itemSet.messages.get(insertToIndex)!;
  const date = targetItem.date;
  const offset = targetItem.offset - 0.5;
  const newMessageItem: MessageItem = { ...messageItem, moving: true, date, offset };
  const messages = insertItem(itemSet.messages.remove(index), newMessageItem);
  return { ...itemSet, messages };
};

export const resetMovingMessage = (itemSet: ChatItemSet, id: Id): ChatItemSet => {
  const index = itemSet.messages.findLastIndex((item) => item.id === id);
  if (index === undefined) {
    return itemSet;
  }
  const messageItem = itemSet.messages.get(index);
  if (messageItem === undefined || messageItem.type !== 'MESSAGE' || messageItem.moving !== true) {
    console.warn('unexpected message when reset moving message');
    return itemSet;
  }
  const { orderOffset, orderDate } = messageItem.message;
  const messages = insertItem(itemSet.messages.remove(index), {
    ...messageItem,
    moving: undefined,
    date: orderDate,
    offset: orderOffset,
  });
  return { ...itemSet, messages };
};
