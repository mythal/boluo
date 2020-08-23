import * as React from 'react';
import { useLayoutEffect, useRef } from 'react';
import store, { useSelector } from '../../store';
import { useVirtual } from '../../hooks/useVirtual';
import ChatListItem from '../molecules/ChatListItem';
import { css } from '@emotion/core';
import { bgColor } from '../../styles/colors';
import LoadMore, { loadMoreHeight } from '../molecules/LoadMore';
import { Id } from '../../utils/id';
import { DraggableProvided, DraggableRubric, DraggableStateSnapshot, Droppable } from 'react-beautiful-dnd';
import { delay } from '../../utils/browser';

interface Props {
  channelId: Id;
  previewIndex?: number;
  myId?: Id;
}

const container = css`
  grid-area: list;
  background-color: ${bgColor};
  overflow-y: scroll;
`;

const virtualItemStyle = css`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
`;

function estimateSize(index: number, width = 800): number {
  if (index === 0) {
    return loadMoreHeight;
  }
  index += 1;
  width -= 200;
  const item = store.getState().chat?.itemSet.messages.get(index);
  let inGame = true;
  let text = ' ';
  if (item === undefined) {
    return 0;
  } else if (item.type === 'MESSAGE') {
    text = item.message.text;
    inGame = item.message.inGame;
  } else if (item.type === 'PREVIEW') {
    text = item.preview.text || ' ';
    inGame = item.preview.inGame;
  }
  const fontWidth = inGame ? 18 : 16;
  const fontHeight = inGame ? 26 : 18;
  const r = text.match(/\n/g)?.length || 0;
  const length = Math.max(text.length, 1);
  const lineCount = Math.ceil((length * fontWidth) / width) + r;
  const height = lineCount * fontHeight;
  const padding = 20;
  return height + padding;
}

function ChatVirtualList({ previewIndex, myId, channelId }: Props) {
  const displayNewPreviewCompose = myId !== undefined && previewIndex === undefined;
  let messagesLength = useSelector((state) => state.chat!.itemSet.messages.size);
  if (displayNewPreviewCompose) {
    messagesLength += 1;
  }
  const parentRef = useRef<HTMLDivElement>(null);
  const prevMessagesLen = useRef<number>(messagesLength);
  const { viewportStart, viewportEnd, totalSize, scrollToIndex, virtualItems, measure, cacheShift } = useVirtual({
    size: messagesLength + 1, // + 1 for "load more" button
    parentRef,
    estimateSize,
    renderThreshold: 8,
    overscan: 32,
  });
  const prevEnd = useRef(viewportEnd);
  useLayoutEffect(() => {
    const prevLen = prevMessagesLen.current;
    if (messagesLength > prevLen) {
      const delta = messagesLength - prevLen;
      prevMessagesLen.current = messagesLength;
      let align: 'start' | 'end' = 'start';
      let toIndex: number = viewportStart + delta;
      if (prevMessagesLen.current - prevEnd.current < 4) {
        align = 'end';
        toIndex = viewportEnd + delta;
      }
      const scroll = () => scrollToIndex(toIndex, { align });
      delay(scroll);
      delay(scroll, 200);
      delay(scroll, 400);
      delay(scroll, 600);
    }
    prevEnd.current = viewportEnd;
  }, [viewportStart, viewportEnd, scrollToIndex, messagesLength]);
  if (messagesLength === 0 && !displayNewPreviewCompose) {
    return (
      <div css={container}>
        <LoadMore shift={cacheShift} />
      </div>
    );
  }

  const renderStickyCompose = previewIndex && (previewIndex + 1 < viewportStart || previewIndex + 1 > viewportEnd);
  const items = virtualItems.map(({ index, size, start }) => {
    if ((index === messagesLength || index - 1 === previewIndex) && renderStickyCompose) {
      return null;
    }
    return (
      <div
        key={index}
        css={virtualItemStyle}
        style={{
          height: `${size}px`,
          transform: `translateY(${start}px)`,
        }}
      >
        {index === 0 ? <LoadMore shift={cacheShift} /> : <ChatListItem measure={measure} itemIndex={index - 1} />}
      </div>
    );
  });
  if (renderStickyCompose) {
    const parent = parentRef.current;
    if (parent !== null) {
      const rect = parent.getBoundingClientRect();
      const style: React.CSSProperties = {
        position: 'fixed',
        width: rect.width,
      };
      if (previewIndex === undefined || previewIndex + 1 > viewportEnd) {
        style.bottom = 0;
      }
      items.push(
        <div key={previewIndex ? previewIndex + 1 : messagesLength} style={style}>
          <ChatListItem float itemIndex={previewIndex || messagesLength + 1} />
        </div>
      );
    }
  }
  return (
    <div css={container} ref={parentRef}>
      <Droppable
        droppableId={channelId}
        type="CHANNEL"
        mode="virtual"
        renderClone={(provided: DraggableProvided, snapshot: DraggableStateSnapshot, rubric: DraggableRubric) => (
          <ChatListItem itemIndex={rubric.source.index} isDragging provided={provided} />
        )}
      >
        {(provided) => (
          <div
            ref={provided.innerRef}
            style={{
              height: `${totalSize}px`,
              width: '100%',
              position: 'relative',
            }}
            {...provided.droppableProps}
          >
            {items}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default React.memo(ChatVirtualList);
