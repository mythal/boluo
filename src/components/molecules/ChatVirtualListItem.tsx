import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { VirtualResult } from '../../hooks/useVirtual';
import LoadMore from './LoadMore';
import { ChannelMember } from '../../api/channels';
import ChatDraggableItem from './ChatDraggableItem';
import { MessageItem, PreviewItem } from '../../states/chat-item-set';
import { chatItemPlaceHolder } from '../atoms/ChatItemContainer';

interface Props {
  index: number;
  size: number;
  start: number;
  end: number;
  item: PreviewItem | MessageItem | undefined;
  myMember: ChannelMember | undefined;
  resizeObserverRef: React.RefObject<ResizeObserver>;
  measure: VirtualResult['measure'];
  shift: VirtualResult['cacheShift'];
  rangeStart: number;
  rangeEnd: number;
  viewportStart: number;
  viewportEnd: number;
  dragging?: boolean;
}

export function ChatVirtualListItem({
  index,
  item,
  size,
  end,
  shift,
  measure,
  viewportStart,
  viewportEnd,
  myMember,
  resizeObserverRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [deferred, setDeferred] = useState(index < viewportStart || index > viewportEnd);

  useEffect(() => {
    let timeout: number | undefined = undefined;
    let order = 0;
    if (index < viewportStart) {
      order = viewportStart - index;
    } else if (index > viewportEnd) {
      order = index - viewportEnd;
    }
    if (deferred) {
      if (order === 0) {
        setDeferred(false);
      } else {
        timeout = window.setTimeout(() => {
          setDeferred(false);
        }, order * 20 + 50);
      }
    }
    return () => window.clearTimeout(timeout);
  }, [viewportEnd, viewportStart, index, deferred, measure]);

  useEffect(() => {
    if (index !== 0 && containerRef.current && !deferred) {
      if (resizeObserverRef.current) {
        const observer = resizeObserverRef.current;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        measure(rect, index);
        observer.observe(container, {});
        return () => observer.unobserve(container);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef.current, deferred, resizeObserverRef.current, measure, index]);

  const style: React.CSSProperties = {
    height: size,
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    transform: `translateY(-${end}px)`,
  };
  const containerProps: React.HTMLProps<HTMLDivElement> = {
    style,
  };

  if (deferred) {
    return <div {...containerProps} css={chatItemPlaceHolder} />;
  }

  if (index === 0) {
    return (
      <div {...containerProps}>
        <LoadMore shift={shift} />
      </div>
    );
  }

  return (
    <div {...containerProps}>
      <div ref={containerRef} data-index={index}>
        <ChatDraggableItem item={item} myMember={myMember} index={index} />
      </div>
    </div>
  );
}
