import { GetMe, Member } from 'api';
import { FC, MutableRefObject } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { START_INDEX } from '../../hooks/useChatList';
import { ChatItem } from '../../types/chat-items';
import { ChatContentHeader } from './ChatContentHeader';
import { ChatItemSwitch } from './ChatItemSwitch';

interface Props {
  firstItemIndex: number;
  renderRangeRef: MutableRefObject<[number, number]>;
  virtuosoRef: MutableRefObject<VirtuosoHandle | null>;
  scrollerRef: MutableRefObject<HTMLDivElement | null>;
  chatList: ChatItem[];
  filteredMessageCount: number;
  handleBottomStateChange: (bottom: boolean) => void;
  me: GetMe | null;
  myMember: Member | null;
}

export interface VirtualListContext {
  filteredMessageCount: number;
}

const CONTINUOUS_TIME_MS = 5 * 60 * 1000;
const isContinuous = (a: ChatItem | null | undefined, b: ChatItem | null | undefined): boolean => {
  if (
    a == null || b == null || a.type !== 'MESSAGE' || b.type !== 'MESSAGE' // type
    || a.senderId !== b.senderId || a.name !== b.name // sender
    || a.folded || b.folded || a.whisperToUsers || b.whisperToUsers // other
  ) {
    return false;
  }
  const timeDiff = Math.abs(Date.parse(a.created) - Date.parse(b.created));
  return timeDiff < CONTINUOUS_TIME_MS;
};

export const ChatContentVirtualList: FC<Props> = (props) => {
  const {
    firstItemIndex,
    renderRangeRef,
    virtuosoRef,
    chatList,
    scrollerRef,
    filteredMessageCount,
    handleBottomStateChange,
    me,
    myMember,
  } = props;
  const totalCount = chatList.length;

  let prevOffsetIndex = Number.MIN_SAFE_INTEGER;
  let prevItem: ChatItem | null = null;
  const itemContent = (offsetIndex: number, item: ChatItem) => {
    let continuous = false;
    if (offsetIndex - 1 === prevOffsetIndex) {
      continuous = isContinuous(prevItem, item);
    }

    prevOffsetIndex = offsetIndex;
    prevItem = item;
    return (
      <ChatItemSwitch
        key={item.key}
        myId={me?.user.id}
        chatItem={item}
        isMember={myMember !== null}
        continuous={continuous}
      />
    );
  };
  return (
    <Virtuoso<ChatItem, VirtualListContext>
      className="overflow-x-hidden"
      firstItemIndex={firstItemIndex}
      ref={virtuosoRef}
      scrollerRef={(ref) => {
        if (ref instanceof HTMLDivElement || ref === null) scrollerRef.current = ref;
      }}
      context={{ filteredMessageCount }}
      components={{ Header: ChatContentHeader }}
      data={chatList}
      initialTopMostItemIndex={{ index: totalCount - 1, align: 'end' }}
      atBottomThreshold={64}
      increaseViewportBy={{ top: 512, bottom: 128 }}
      overscan={{ main: 128, reverse: 512 }}
      itemContent={itemContent}
      followOutput="auto"
      atBottomStateChange={handleBottomStateChange}
    />
  );
};
