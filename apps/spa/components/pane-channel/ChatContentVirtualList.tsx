import { type FC, type RefObject, useCallback, useMemo } from 'react';
import {
  type ListRange,
  type ScrollSeekPlaceholderProps,
  Virtuoso,
  type VirtuosoHandle,
} from 'react-virtuoso';
import { type ChatItem } from '../../state/channel.types';
import { ChatContentHeader } from './ChatContentHeader';
import {
  type OnVirtualKeybroadChange,
  useVirtualKeybroadChange,
} from '../../hooks/useVirtualKeybroadChange';
import { useSettings } from '../../hooks/useSettings';
import { useMutateSettings } from '@boluo/hooks/useMutateSettings';
import { IsOptimisticContext } from '../../hooks/useIsOptimistic';
import { ChatItemMessage } from './ChatItemMessage';
import { SelfPreview } from './SelfPreview';
import { OthersPreview } from './OthersPreview';
import { virtualChatItemKey } from '../../hooks/useChatList';

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
  );
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

  const firstItemIndex = props.firstItemIndex;
  const itemContent = (offsetIndex: number, item: ChatItem) => {
    const arrayIndex = offsetIndex - firstItemIndex;
    const isLast = totalCount - 1 === arrayIndex;
    const continuous = isContinuous(chatList[arrayIndex - 1], item);

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
      computeItemKey={(_index, item) => virtualChatItemKey(item)}
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
