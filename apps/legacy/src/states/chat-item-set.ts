import { List, Map } from 'immutable';
import { isEmptyPreview, Preview } from '../api/events';
import { Message, MessageOrder } from '../api/messages';
import { Id } from '../utils/id';

export interface ChatNode {
  id: Id;
  pos: number;
  mine: boolean;
}

export interface MessageItem extends ChatNode {
  type: 'MESSAGE';
  message: Message;
  moving?: boolean;
}

export const makeMessageItem =
  (myId?: Id) =>
  (message: Message): MessageItem => ({
    id: message.id,
    pos: message.pos,
    mine: message.senderId === myId,
    type: 'MESSAGE',
    message,
  });

export interface PreviewItem extends ChatNode {
  type: 'PREVIEW';
  preview: Preview;
}

export type ChatItem = MessageItem | PreviewItem;

export interface ChatItemSet {
  messages: List<MessageItem | PreviewItem>;
  previews: Map<Id, PreviewItem>;
}

export const initialChatItemSet: ChatItemSet = {
  messages: List(),
  previews: Map<Id, PreviewItem>(),
};

const insertItem = (messages: ChatItemSet['messages'], newItem: MessageItem | PreviewItem): ChatItemSet['messages'] => {
  if (messages.size === 0) {
    return messages.push(newItem);
  }
  const { pos } = newItem;
  const first = messages.first()!;
  if (pos < first.pos) {
    return messages.unshift(newItem);
  }
  const last = messages.last()!;
  if (pos > last.pos) {
    return messages.push(newItem);
  }
  for (let i = messages.size - 1; i >= 0; i--) {
    const current = messages.get(i);
    if (current === undefined) {
      throw new Error('unexpected undefined item in messages');
    }
    if (current.pos === pos) {
      if (current.type === 'MESSAGE') {
        return messages;
      } else {
        return messages.set(i, newItem);
      }
    } else if (pos > current.pos) {
      return messages.insert(i + 1, newItem);
    }
  }

  console.error("Can't find the insertion position");
  return messages;
};

const removeItem = (messages: ChatItemSet['messages'], id: Id): ChatItemSet['messages'] => {
  const index = findItem(messages, id);
  if (index !== -1) {
    return messages.remove(index);
  } else {
    return messages;
  }
};

const findItem = (messages: ChatItemSet['messages'], id: Id): number => {
  if (messages.isEmpty()) {
    return -1;
  }

  return messages.findLastIndex((item) => {
    return item.id === id;
  });
};

export const addItem = ({ messages, previews }: ChatItemSet, item: ChatItem): ChatItemSet => {
  if (item.type === 'MESSAGE') {
    const previewItem = previews.get(item.message.senderId);
    if (previewItem && item.message.id === previewItem.preview.id) {
      messages = removeItem(messages, item.message.senderId);
      previews = previews.remove(item.message.senderId);
    }
    messages = insertItem(messages, item);
  }

  if (item.type === 'PREVIEW') {
    const prevPreview = previews.get(item.id);
    if (prevPreview) {
      messages = removeItem(messages, item.id);
    }
    if (isEmptyPreview(item.preview)) {
      previews = previews.remove(item.id);
      messages = removeItem(messages, item.id);
    } else {
      previews = previews.set(item.id, item);
      if (!item.preview.editFor) {
        messages = insertItem(messages, item);
      }
    }
  }

  return { messages, previews };
};

export const deleteMessage = (itemSet: ChatItemSet, messageId: Id): ChatItemSet => {
  const index = findItem(itemSet.messages, messageId);
  if (index === -1) {
    return itemSet;
  }
  const messages = itemSet.messages.remove(index);
  return { ...itemSet, messages };
};

export const updateMessagesOrder = (itemSet: ChatItemSet, orderChanges: MessageOrder[]): ChatItemSet => {
  let { messages } = itemSet;
  for (const change of orderChanges) {
    const index = findItem(messages, change.id);
    if (index !== -1) {
      messages = messages.update(index, (item) => {
        if (!item) {
          throw new Error('item is empty');
        }
        if (item.type !== 'MESSAGE') {
          return { ...item, date: change.orderDate, offset: change.orderOffset };
        } else {
          const message: Message = { ...item.message, ...change };
          return { ...item, message, date: change.orderDate, offset: change.orderOffset };
        }
      });
    }
  }
  return { ...itemSet, messages };
};

export const moveMessages = (messages: ChatItemSet['messages'], movedItems: MessageItem[]): ChatItemSet['messages'] => {
  return messages;
};

export const editMessage = (itemSet: ChatItemSet, editedItem: MessageItem, finished: boolean): ChatItemSet => {
  let { messages } = itemSet;
  const top = messages.first();
  if (top === undefined) {
    return itemSet;
  }
  const index = findItem(itemSet.messages, editedItem.id);
  if (index === -1) {
    if (editedItem.pos < top.pos) {
      return itemSet;
    }
    return addItem(itemSet, editedItem);
  }
  const target = messages.get(index);
  if (target === undefined || target.type !== 'MESSAGE') {
    throw new Error('unexpected item type');
  }
  if (editedItem.pos < top.pos) {
    messages = messages.remove(index);
    let nextItemSet: ChatItemSet = { ...itemSet, messages };
    if (finished) {
      nextItemSet = addItem(nextItemSet, editedItem);
    }
    return nextItemSet;
  } else if (target.pos === editedItem.pos) {
    messages = messages.set(index, editedItem);
    return { ...itemSet, messages };
  } else {
    return addItem({ ...itemSet, messages: messages.remove(index) }, editedItem);
  }
};

export const markMessageMoving = (
  itemSet: ChatItemSet,
  messageItem: MessageItem,
  targetItem: PreviewItem | MessageItem | undefined,
): ChatItemSet => {
  const index = findItem(itemSet.messages, messageItem.id);
  const messages = itemSet.messages.remove(index);
  return { ...itemSet, messages };
};

export const resetMovingMessage = (itemSet: ChatItemSet, id: Id): ChatItemSet => {
  const index = findItem(itemSet.messages, id);
  if (index === -1) {
    return itemSet;
  }
  const messageItem = itemSet.messages.get(index);
  if (messageItem === undefined || messageItem.type !== 'MESSAGE' || messageItem.moving !== true) {
    throw new Error('unexpected message when reset moving message');
  }
  const messages = insertItem(itemSet.messages.remove(index), {
    ...messageItem,
    moving: undefined,
  });
  return { ...itemSet, messages };
};
