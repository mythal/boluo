import { GetMe, User } from '@boluo/api';
import { FC, MutableRefObject, RefObject, useLayoutEffect, useRef } from 'react';
import { ListRange, ScrollSeekPlaceholderProps, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
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
  scrollerRef: MutableRefObject<HTMLDivElement | null>;
  chatList: ChatItem[];
  filteredMessagesCount: number;
  currentUser: User | undefined | null;
  myMember: MyChannelMemberResult;
  theme: ResolvedTheme;
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

const useWorkaroundFirstItemIndex = (virtuosoRef: RefObject<VirtuosoHandle | null>, originalFirstItemIndex: number) => {
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
  return firstItemIndex;
};

export const ChatContentVirtualList: FC<Props> = (props) => {
  const { iAmMaster, renderRangeRef, chatList, scrollerRef, filteredMessagesCount, currentUser, myMember, theme } =
    props;
  const totalCount = chatList.length;
  const iAmAdmin = myMember.isOk && myMember.some.space.isAdmin;

  let prevOffsetIndex = Number.MIN_SAFE_INTEGER;
  let prevItem: ChatItem | null = null;
  const myId: string | undefined = currentUser?.id ?? undefined;
  const firstItemIndex = 0;
  const itemContent = (item: ChatItem, index: number) => {
    const isLast = totalCount - 1 === index;

    let continuous = false;
    if (index - 1 === prevOffsetIndex) {
      continuous = isContinuous(prevItem, item);
    }

    prevOffsetIndex = index;
    prevItem = item;
    return (
      <ChatItemSwitch
        isLast={isLast}
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
    <div ref={scrollerRef} className="flex h-full min-h-0 flex-col overflow-y-scroll">
      <ChatContentHeader context={{ filteredMessagesCount }} />
      {chatList.map((item, index) => itemContent(item, index))}
    </div>
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
