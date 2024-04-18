import { GetMe } from '@boluo/api';
import { FC, MutableRefObject, RefObject, useLayoutEffect, useRef } from 'react';
import { ListRange, ScrollSeekPlaceholderProps, Virtuoso, VirtuosoHandle, VirtuosoProps } from 'react-virtuoso';
import { ChatItem } from '../../state/channel.types';
import { ChatContentHeader } from './ChatContentHeader';
import { ChatItemSwitch } from './ChatItemSwitch';
import { ResolvedTheme } from '@boluo/theme';
import { MyChannelMemberResult } from '../../hooks/useMyChannelMember';
import { getOS } from '@boluo/utils';

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
  myMember: MyChannelMemberResult;
  theme: ResolvedTheme;
  setIsScrolling: (isScrolling: boolean) => void;
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

const useIosWorkaround = (
  virtuosoRef: RefObject<VirtuosoHandle | null>,
  originalFirstItemIndex: number,
): { firstItemIndex: number } => {
  const os = getOS();
  // In iOS/iPadOS, the behavior of `firstItemIndex` is weird, use a fallback method to fix it
  const workaroundOnLoad = os === 'iOS';

  const firstItemIndex = workaroundOnLoad ? 0 : originalFirstItemIndex;

  const prevFirstItemIndex = useRef(originalFirstItemIndex);
  useLayoutEffect(() => {
    if (!workaroundOnLoad || virtuosoRef.current == null) return;
    const virtuoso = virtuosoRef.current;
    if (prevFirstItemIndex.current > originalFirstItemIndex) {
      const diff = prevFirstItemIndex.current - originalFirstItemIndex;
      virtuoso.scrollToIndex({ index: Math.max(0, diff - 1), align: 'start' });
    }
    prevFirstItemIndex.current = originalFirstItemIndex;
  }, [originalFirstItemIndex, virtuosoRef, workaroundOnLoad]);
  return { firstItemIndex };
};

export const ChatContentVirtualList: FC<Props> = (props) => {
  const {
    iAmMaster,
    renderRangeRef,
    virtuosoRef,
    chatList,
    scrollerRef,
    filteredMessagesCount,
    handleBottomStateChange,
    setIsScrolling,
    me,
    myMember,
    theme,
  } = props;
  const windowHeight = useRef(window.innerHeight);
  const totalCount = chatList.length;
  const iAmAdmin = myMember.isOk && myMember.some.space.isAdmin;

  let prevOffsetIndex = Number.MIN_SAFE_INTEGER;
  let prevItem: ChatItem | null = null;
  let myId: string | undefined;
  if (me && me !== 'LOADING') {
    myId = me.user.id;
  }
  const { firstItemIndex } = useIosWorkaround(virtuosoRef, props.firstItemIndex);
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
        iAmAdmin={iAmAdmin}
        key={item.key}
        myId={myId}
        chatItem={item}
        isMember={myMember.isOk}
        continuous={continuous}
        theme={theme}
      />
    );
  };
  const handleRangeChange = (range: ListRange) => {
    renderRangeRef.current = [range.startIndex - firstItemIndex, range.endIndex - firstItemIndex];
  };
  return (
    <Virtuoso<ChatItem, VirtualListContext>
      className="overflow-x-hidden"
      style={{ overflowY: 'scroll', overscrollBehavior: 'none' }}
      ref={virtuosoRef}
      scrollerRef={(ref) => {
        if (ref instanceof HTMLDivElement || ref === null) scrollerRef.current = ref;
      }}
      isScrolling={setIsScrolling}
      rangeChanged={handleRangeChange}
      alignToBottom
      context={{ filteredMessagesCount }}
      components={{ Header: ChatContentHeader, ScrollSeekPlaceholder }}
      scrollSeekConfiguration={{
        enter: (velocity) => {
          return (
            Math.abs(velocity) > 600 &&
            /* High velocity also can be triggered by load messages */
            velocity < 1200
          );
        },
        exit: (velocity) => Math.abs(velocity) < 100,
      }}
      data={chatList}
      initialTopMostItemIndex={{ index: totalCount - 1, align: 'end' }}
      atBottomThreshold={64}
      overscan={windowHeight.current * 3}
      itemContent={itemContent}
      followOutput="auto"
      atBottomStateChange={handleBottomStateChange}
      firstItemIndex={firstItemIndex}
    />
  );
};

const placeHolderColors = [
  'bg-text-lighter/30',
  'bg-text-lighter/30',
  'bg-text-lighter/50',
  'bg-text-lighter/10',
  'bg-text-lighter/30',
  'bg-text-lighter/60',
];

const ScrollSeekPlaceholder: FC<ScrollSeekPlaceholderProps> = ({ height, index }) => (
  <div
    className={`@2xl:pl-[17.5rem] py-2 pl-20 pr-4 ${index % 2 === 0 ? 'bg-message-inGame-bg' : ''}`}
    style={{
      height,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}
  >
    <div className={`${placeHolderColors[index % placeHolderColors.length]} h-full rounded`}></div>
  </div>
);
