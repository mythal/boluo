import { type FC, type RefObject, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import {
  type ListRange,
  type ScrollSeekPlaceholderProps,
  Virtuoso,
  type VirtuosoHandle,
} from 'react-virtuoso';
import { type ChatItem } from '../../state/channel.types';
import { ChatContentHeader } from './ChatContentHeader';
import { getOS } from '@boluo/utils/browser';
import {
  type OnVirtualKeybroadChange,
  useVirtualKeybroadChange,
} from '../../hooks/useVirtualKeybroadChange';
import { useSettings } from '../../hooks/useSettings';
import { useMutateSettings } from '../../hooks/useMutateSettings';
import { IsOptimisticContext } from '../../hooks/useIsOptimistic';
import { ChatItemMessage } from './ChatItemMessage';
import { SelfPreview } from './SelfPreview';
import { OthersPreview } from './OthersPreview';

interface Props {
  firstItemIndex: number;
  renderRangeRef: RefObject<[number, number]>;
  virtuosoRef: RefObject<VirtuosoHandle | null>;
  scrollerRef: RefObject<HTMLDivElement | null>;
  chatList: ChatItem[];
  filteredMessagesCount: number;
  handleBottomStateChange?: (bottom: boolean) => void;
  setIsScrolling: (isScrolling: boolean) => void;
  currentUserId?: string | undefined | null;
}

export interface VirtualListContext {
  filteredMessagesCount: number;
  showOmega: boolean;
  alignToBottom: boolean;
  toggleAlignToBottom: () => void;
}

const isContinuous = (a: ChatItem | null | undefined, b: ChatItem | null | undefined): boolean => {
  return !(
    (
      a == null ||
      b == null ||
      a.type !== 'MESSAGE' ||
      b.type !== 'MESSAGE' || // type
      a.senderId !== b.senderId ||
      a.name !== b.name || // sender
      a.folded ||
      b.folded ||
      a.whisperToUsers ||
      b.whisperToUsers
    ) // other
  );
};

const useWorkaroundFirstItemIndex = (
  virtuosoRef: RefObject<VirtuosoHandle | null>,
  originalFirstItemIndex: number,
) => {
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
  const settings = useSettings();
  const alignToBottom = settings.alignToBottom ?? true;
  const { trigger: updateSettings } = useMutateSettings();
  const toggleAlignToBottom = useCallback(() => {
    const nextAlignToBottom = !alignToBottom;
    void updateSettings(
      { alignToBottom: nextAlignToBottom },
      {
        optimisticData: (current) => ({
          ...(current ?? {}),
          alignToBottom: nextAlignToBottom,
        }),
      },
    );
  }, [alignToBottom, updateSettings]);
  const {
    renderRangeRef,
    virtuosoRef,
    chatList,
    scrollerRef,
    filteredMessagesCount,
    handleBottomStateChange,
    setIsScrolling,
    currentUserId,
  } = props;
  const totalCount = chatList.length;
  const onVirtualKeybroadChange: OnVirtualKeybroadChange = useCallback(
    (rect, prevRect) => {
      if (rect.height <= prevRect.height) return;
      virtuosoRef.current?.scrollToIndex({ index: totalCount - 1, align: 'end' });
    },
    [totalCount, virtuosoRef],
  );
  useVirtualKeybroadChange(onVirtualKeybroadChange);

  let prevOffsetIndex = Number.MIN_SAFE_INTEGER;
  let prevItem: ChatItem | null = null;
  const firstItemIndex = useWorkaroundFirstItemIndex(virtuosoRef, props.firstItemIndex);
  const itemContent = (offsetIndex: number, item: ChatItem) => {
    const isLast = totalCount - 1 === offsetIndex - firstItemIndex;

    let continuous = false;
    if (offsetIndex - 1 === prevOffsetIndex) {
      continuous = isContinuous(prevItem, item);
    }

    // eslint-disable-next-line react-hooks/immutability
    prevOffsetIndex = offsetIndex;
    prevItem = item;

    switch (item.type) {
      case 'MESSAGE':
        return (
          <IsOptimisticContext value={item.optimistic || false}>
            <ChatItemMessage isLast={isLast} message={item} continuous={continuous} />
          </IsOptimisticContext>
        );
      case 'PREVIEW':
        return (
          <IsOptimisticContext value={item.optimistic || false}>
            {currentUserId && item.senderId === currentUserId ? (
              <SelfPreview isLast={isLast} preview={item} virtualListIndex={offsetIndex} />
            ) : (
              <OthersPreview isLast={isLast} preview={item} />
            )}
          </IsOptimisticContext>
        );
      default:
        return <div className="p-4">Not implemented</div>;
    }
  };
  const handleRangeChange = (range: ListRange) => {
    renderRangeRef.current = [range.startIndex - firstItemIndex, range.endIndex - firstItemIndex];
  };
  const showOmega = chatList.length > 32;
  const context: VirtualListContext = useMemo(
    () => ({
      filteredMessagesCount,
      showOmega,
      alignToBottom,
      toggleAlignToBottom,
    }),
    [alignToBottom, filteredMessagesCount, showOmega, toggleAlignToBottom],
  );
  return (
    <Virtuoso<ChatItem, VirtualListContext>
      className="overflow-x-hidden"
      style={{ overflowY: 'scroll', overscrollBehavior: 'none' }}
      ref={virtuosoRef}
      scrollerRef={(ref) => {
        if (ref instanceof HTMLDivElement || ref == null) scrollerRef.current = ref;
      }}
      isScrolling={setIsScrolling}
      rangeChanged={handleRangeChange}
      alignToBottom={alignToBottom}
      context={context}
      components={{ Header: ChatContentHeader, ScrollSeekPlaceholder }}
      scrollSeekConfiguration={{
        enter: (velocity) => {
          return (
            Math.abs(velocity) > 1200 &&
            /* High velocity also can be triggered by load messages */
            velocity < 1600
          );
        },
        exit: (velocity) => Math.abs(velocity) < 100,
      }}
      data={chatList}
      initialTopMostItemIndex={{ index: totalCount - 1, align: 'end' }}
      atBottomThreshold={64}
      increaseViewportBy={{ top: 512, bottom: 128 }}
      overscan={{ main: 128, reverse: 512 }}
      itemContent={itemContent}
      followOutput="auto"
      atBottomStateChange={handleBottomStateChange}
      firstItemIndex={firstItemIndex}
    />
  );
};

const placeHolderColors = [
  'bg-text-subtle/30',
  'bg-text-subtle/30',
  'bg-text-subtle/50',
  'bg-text-subtle/10',
  'bg-text-subtle/30',
  'bg-text-subtle/60',
];

const ScrollSeekPlaceholder: FC<ScrollSeekPlaceholderProps> = ({ height, index }) => (
  <div
    className={`irc:pl-70 py-2 pr-4 pl-20 ${index % 2 === 0 ? 'bg-message-in-game-bg' : ''}`}
    style={{
      height,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}
  >
    <div className={`${placeHolderColors[index % placeHolderColors.length]} h-full rounded`}></div>
  </div>
);
