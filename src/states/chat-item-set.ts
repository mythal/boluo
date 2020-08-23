import { Id, newId } from '../utils/id';
import { Message, MessageOrder } from '../api/messages';
import { Preview } from '../api/events';
import { List, Map } from 'immutable';
import { DEBUG } from '../settings';

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
  if (messages.size === 0) {
    return messages.push(newItem);
  } else if (newItem.date < messages.first(undefined)!.date) {
    return messages.unshift(newItem);
  }
  const last = messages.last(undefined)!;
  const first = messages.first(undefined)!;
  if (newItem.date < first.date || (newItem.date === first.date && newItem.offset < first.offset)) {
    return messages.unshift(newItem);
  }
  if (last.date < newItem.date || (last.date === newItem.date && last.offset < newItem.offset)) {
    return messages.push(newItem);
  }

  let i = -1;
  let m = 0;
  let n = messages.size - 1;
  // [0 1 2 3 4]
  //   0 1 2 3
  while (m < n) {
    const mid = m + ((n - m) >> 1);
    const pivotA = messages.get(mid);
    const pivotB = messages.get(mid + 1);
    if (pivotA === undefined || pivotB === undefined) {
      throw new Error('unexpected error: pivot cannot be found');
    }
    if (pivotB.date < newItem.date || (pivotB.date === newItem.date && pivotB.offset < newItem.offset)) {
      m = mid + 1;
    } else if (newItem.date < pivotA.date || (pivotA.date === newItem.date && newItem.offset < pivotA.offset)) {
      n = mid;
    } else {
      i = mid + 1;
      break;
    }
  }
  if (DEBUG) {
    const index =
      messages.findLastIndex((item) => {
        if (item.date < newItem.date) {
          return true;
        } else if (item.date === newItem.date) {
          return item.offset < newItem.offset;
        } else {
          return false;
        }
      }) + 1;
    if (i !== index) {
      // eslint-disable-next-line no-debugger
      debugger;
    }
  }

  return messages.insert(i, newItem);
};

const removeItem = (messages: ChatItemSet['messages'], id: Id, order?: [number, number]): ChatItemSet['messages'] => {
  const index = findItem(messages, id, order);
  if (index !== -1) {
    return messages.remove(index);
  } else {
    return messages;
  }
};

const findItem = (messages: ChatItemSet['messages'], id: Id, order?: [number, number]): number => {
  if (messages.isEmpty()) {
    return -1;
  }
  let index = -1;
  if (order !== undefined) {
    const [date, offset] = order;
    if (date > messages.last(undefined)!.date) {
      return -1;
    } else if (date < messages.first(undefined)!.date) {
      return -1;
    }

    let m = 0;
    let n = messages.size;

    while (m < n) {
      const mid = m + ((n - m) >> 1);
      const pivot = messages.get(mid)!;
      if (pivot.date < date || (pivot.date === date && pivot.offset < offset)) {
        m = mid + 1;
      } else if (date < pivot.date || (pivot.date === date && offset < pivot.offset)) {
        n = mid;
      } else {
        if (pivot.id !== id) {
          index = -1;
        } else {
          index = mid;
        }
        break;
      }
    }
  }
  if (index === -1) {
    if (order !== undefined) {
      console.warn('find index degenerated');
    }
    return messages.findLastIndex((item) => {
      return item.id === id;
    });
  } else {
    return index;
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
  if (item.type === 'EDIT') {
    if (!item.mine && item.preview?.text === '') {
      editions = editions.remove(item.id);
    } else {
      editions = editions.set(item.id, item);
    }
    return { messages, previews, editions };
  }
  const oldest = messages.first(undefined);
  if (oldest && (item.date < oldest.date || (item.date === oldest.date && item.offset < oldest.offset))) {
    return { messages, previews, editions };
  }

  if (item.type === 'MESSAGE') {
    messages = insertItem(messages, item);
    const previewItem = previews.get(item.message.senderId);
    if (previewItem && item.message.id === previewItem.preview.id) {
      if (previewItem.date === item.date && previewItem.mine) {
        const newPreviewItem = dummyPreview(previewItem.preview);
        previews = previews.set(newPreviewItem.id, newPreviewItem);
        messages = removeItem(messages, previewItem.id, [previewItem.date, previewItem.offset]).push(newPreviewItem);
      } else {
        previews = previews.remove(previewItem.id);
        messages = removeItem(messages, previewItem.id, [previewItem.date, previewItem.offset]);
      }
    }
  } else if (item.type === 'PREVIEW') {
    const prevPreview = previews.get(item.id);
    if (prevPreview) {
      messages = removeItem(messages, item.id, [prevPreview.date, prevPreview.offset]);
    }
    if (!item.mine && item.preview.text === '') {
      previews = previews.remove(item.id);
    } else {
      previews = previews.set(item.id, item);
      messages = insertItem(messages, item);
    }
  }

  return { messages, previews, editions };
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

export const moveMessages = (
  messages: ChatItemSet['messages'],
  movedItems: MessageItem[],
  messageBefore: number
): ChatItemSet['messages'] => {
  for (const item of movedItems) {
    if (item.date < messageBefore) {
      messages = removeItem(messages, item.id);
    }
    const index = findItem(messages, item.id);
    if (index !== -1) {
      messages = messages.remove(index);
    }
  }
  for (const item of movedItems) {
    if (item.date < messageBefore) {
      continue;
    }
    messages = insertItem(messages, item);
  }
  return messages;
};

export const editMessage = (itemSet: ChatItemSet, editedItem: MessageItem, messageBefore: number): ChatItemSet => {
  let { messages } = itemSet;
  // item order shouldn't changed.
  const index = findItem(itemSet.messages, editedItem.id, [editedItem.date, editedItem.offset]);
  if (index === -1) {
    if (editedItem.date < messageBefore) {
      return itemSet;
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
  return { ...itemSet, messages };
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
      offset: lastItem.offset + 0.5,
    };
    const messages = itemSet.messages.remove(index).push(newMessageItem);
    return { ...itemSet, messages };
  }
  const targetItem = itemSet.messages.get(insertToIndex)!;
  let date: number;
  let offset: number;
  if (insertToIndex === 0) {
    date = targetItem.date;
    offset = targetItem.offset - 0.5;
  } else {
    const targetLeft = itemSet.messages.get(insertToIndex - 1)!;
    if (targetLeft.date === targetItem.date) {
      date = targetItem.date;
      offset = (targetLeft.offset + targetItem.offset) / 2;
    } else {
      date = targetItem.date;
      offset = targetItem.offset - 0.5;
    }
  }
  const newMessageItem: MessageItem = { ...messageItem, moving: true, date, offset };
  const messages = insertItem(itemSet.messages.remove(index), newMessageItem);
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
  const { orderOffset, orderDate } = messageItem.message;
  const messages = insertItem(itemSet.messages.remove(index), {
    ...messageItem,
    moving: undefined,
    date: orderDate,
    offset: orderOffset,
  });
  return { ...itemSet, messages };
};
