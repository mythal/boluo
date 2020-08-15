import * as React from 'react';
import { RefObject, useEffect } from 'react';
import ChatMessageItem from '@/components/molecules/ChatMessageItem';
import ChatPreviewItem from '@/components/molecules/ChatPreviewItem';
import ChatPreviewCompose from './ChatPreviewCompose';
import { ChatItem, PreviewItem } from '@/states/chat-item-set';
import { useSelector } from '@/store';
import { ChatState } from '@/reducers/chat';
import { List } from 'react-virtualized';

interface Props {
  messageIndex: number;
  measure: () => void;
  listRefOnlyIfLast?: RefObject<List>;
}
export const itemCompare = (a: ChatItem, b: ChatItem) => {
  return a.date - b.date;
};
const makePreview = (item: PreviewItem) => {
  if (item.mine) {
    return <ChatPreviewCompose key={item.id} preview={item.preview} />;
  } else {
    return <ChatPreviewItem key={item.id} preview={item.preview} />;
  }
};

const itemFilter = (type: ChatState['filter']) => (item: ChatItem): boolean => {
  if (type === 'NONE') {
    return true;
  }
  const inGame = type === 'IN_GAME';
  if (item.type === 'MESSAGE') {
    return inGame === item.message.inGame;
  } else if (item.type === 'PREVIEW' && item.preview && !item.mine) {
    return inGame === item.preview.inGame;
  } else if (item.type === 'EDIT') {
    if (item.preview) {
      return inGame === item.preview.inGame;
    }
  }
  return true;
};

function Items({ messageIndex, measure, listRefOnlyIfLast }: Props) {
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const messageItem = useSelector((state) => state.chat!.itemSet.messages.get(messageIndex)!);
  const { message } = messageItem;
  const next = useSelector((state) => state.chat!.itemSet.messages.get(messageIndex + 1));
  const editItem = useSelector((state) => state.chat!.itemSet.editions.get(message.id));
  const previewSet = useSelector(
    (state) =>
      state.chat!.itemSet.previews.filter((preview) => {
        return !(preview.date < messageItem.date || (next && preview.date >= next.date));
      }),
    (a, b) => a.equals(b)
  );
  const filterTag = useSelector((state) => state.chat!.filter);
  const myId = useSelector((state) => {
    if (!listRefOnlyIfLast || !state.profile || !state.chat) {
      return undefined;
    }
    return state.profile.channels.get(state.chat.channel.id)?.member.userId;
  });
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
  const filter = itemFilter(filterTag);
  useEffect(() => {
    measure();
    if (listRefOnlyIfLast && listRefOnlyIfLast.current) {
      listRefOnlyIfLast.current.scrollToRow(messageIndex);
    }
  });
  let itemNode: React.ReactNode = null;
  // start editing
  if (editItem !== undefined && editItem.preview === undefined && editItem.mine) {
    itemNode = <ChatPreviewCompose preview={editItem.preview} editTo={message} />;
    // normal message
  } else if (
    editItem === undefined ||
    editItem.preview === undefined ||
    editItem.preview.editFor !== message.modified
  ) {
    if (filter(messageItem)) {
      itemNode = <ChatMessageItem message={message} mine={messageItem.mine} />;
    }
  } else if (editItem.mine && filter(editItem)) {
    itemNode = <ChatPreviewCompose preview={editItem.preview} editTo={message} />;
  } else if (filter(editItem)) {
    itemNode = <ChatPreviewItem preview={editItem.preview} />;
  }
  const previews = [...previewSet.values()].filter(filter).sort(itemCompare).map(makePreview);
  if (myId && !previewSet.has(myId)) {
    previews.push(<ChatPreviewCompose key={myId} preview={undefined} />);
  }

  return (
    <React.Fragment>
      {itemNode}
      {previews}
    </React.Fragment>
  );
}

export const ChatItems = React.memo(Items);

export function NoMessages() {
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const previewSet = useSelector(
    (state) => state.chat!.itemSet.previews,
    (a, b) => a.equals(b)
  );
  const filterTag = useSelector((state) => state.chat!.filter);
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
  const filter = itemFilter(filterTag);
  const myId = useSelector((state) => {
    if (!state.profile || !state.chat) {
      return undefined;
    }
    return state.profile.channels.get(state.chat.channel.id)?.member.userId;
  });
  const previews = [...previewSet.values()].filter(filter).sort(itemCompare).map(makePreview);
  if (myId && !previewSet.has(myId)) {
    previews.push(<ChatPreviewCompose key={myId} preview={undefined} />);
  }
  return <React.Fragment>{previews}</React.Fragment>;
}
