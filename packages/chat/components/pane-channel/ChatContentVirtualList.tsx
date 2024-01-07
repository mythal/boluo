import { GetMe, Member } from 'api';
import { FC, MutableRefObject } from 'react';
import { ListRange, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ChatItem } from '../../state/channel.types';
import { ChatContentHeader } from './ChatContentHeader';
import { ChatItemSwitch } from './ChatItemSwitch';

interface Props {
  iAmMaster: boolean;
  firstItemIndex: number;
  renderRangeRef: MutableRefObject<[number, number]>;
  virtuosoRef: MutableRefObject<VirtuosoHandle | null>;
  scrollerRef: MutableRefObject<HTMLDivElement | null>;
  chatList: ChatItem[];
  filteredMessagesCount: number;
  handleBottomStateChange: (bottom: boolean) => void;
  me: GetMe | 'LOADING' | null;
  myMember: Member | 'LOADING' | null;
}

export interface VirtualListContext {
  filteredMessagesCount: number;
}

const CONTINUOUS_TIME_MS = 5 * 60 * 1000;
const isContinuous = (a: ChatItem | null | undefined, b: ChatItem | null | undefined): boolean => {
  if (
    a == null ||
    b == null ||
    a.type !== 'MESSAGE' ||
    b.type !== 'MESSAGE' || // type
    a.senderId !== b.senderId ||
    a.name !== b.name || // sender
    a.folded ||
    b.folded ||
    a.whisperToUsers ||
    b.whisperToUsers // other
  ) {
    return false;
  }
  const timeDiff = Math.abs(Date.parse(a.created) - Date.parse(b.created));
  return timeDiff < CONTINUOUS_TIME_MS;
};

export const ChatContentVirtualList: FC<Props> = (props) => {
  const {
    iAmMaster,
    firstItemIndex,
    renderRangeRef,
    virtuosoRef,
    chatList,
    scrollerRef,
    filteredMessagesCount,
    handleBottomStateChange,
    me,
    myMember,
  } = props;
  const totalCount = chatList.length;

  let prevOffsetIndex = Number.MIN_SAFE_INTEGER;
  let prevItem: ChatItem | null = null;
  let myId: string | undefined;
  if (me && me !== 'LOADING') {
    myId = me.user.id;
  }

  const itemContent = (offsetIndex: number, item: ChatItem) => {
    let continuous = false;
    if (offsetIndex - 1 === prevOffsetIndex) {
      continuous = isContinuous(prevItem, item);
    }

    prevOffsetIndex = offsetIndex;
    prevItem = item;
    return (
      <ChatItemSwitch
        iAmMaster={iAmMaster}
        key={item.key}
        myId={myId}
        chatItem={item}
        isMember={myMember !== null && myMember !== 'LOADING'}
        continuous={continuous}
      />
    );
  };
  const handleRangeChange = (range: ListRange) => {
    renderRangeRef.current = [range.startIndex - firstItemIndex, range.endIndex - firstItemIndex];
  };
  return (
    <Virtuoso<ChatItem, VirtualListContext>
      className="overflow-x-hidden"
      style={{ overflowY: 'scroll' }}
      firstItemIndex={firstItemIndex}
      ref={virtuosoRef}
      scrollerRef={(ref) => {
        if (ref instanceof HTMLDivElement || ref === null) scrollerRef.current = ref;
      }}
      rangeChanged={handleRangeChange}
      alignToBottom
      context={{ filteredMessagesCount }}
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
