import * as React from 'react';
import { useLayoutEffect, useRef } from 'react';
import { css } from '@emotion/core';
import store, { useSelector } from '../../store';
import LoadMoreButton, { LoadMoreContainer } from '../../components/molecules/LoadMoreButton';
import Loading from '../../components/molecules/Loading';
import { bgColor } from '../../styles/colors';
import { ChatListItems } from '../molecules/ChatListItem';
import { useVirtual } from '../../hooks/useVirtual';
import { Id } from '../../utils/id';

const container = css`
  grid-area: list;
  background-color: ${bgColor};
  overflow-y: scroll;
`;

function loadMore() {
  return (
    <LoadMoreContainer>
      <LoadMoreButton />
    </LoadMoreContainer>
  );
}

function estimateSize(index: number, width = 800): number {
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

function ChatList() {
  const initialized = useSelector((state) => state.chat!.initialized);
  const myId: Id | undefined = useSelector(
    (state) => state.profile?.channels.get(state.chat!.channel.id)?.member.userId
  );
  const previewIndex: number | undefined = useSelector((state) => {
    if (myId === undefined) {
      return;
    }
    const previewItem = state.chat!.itemSet.previews.get(myId);
    if (previewItem === undefined) {
      return;
    }
    return state.chat!.itemSet.messages.findLastIndex((item) => item.id === myId);
  });
  const displayNewPreviewCompose = myId !== undefined && previewIndex === undefined;
  let messagesLength = useSelector((state) => state.chat!.itemSet.messages.size);
  if (displayNewPreviewCompose) {
    messagesLength += 1;
  }
  const parentRef = useRef<HTMLDivElement>(null);
  const prevMessagesLen = useRef<number>(messagesLength);
  const { start, end, totalSize, scrollToIndex, virtualItems } = useVirtual({
    size: messagesLength,
    parentRef,
    estimateSize,
    overscan: 6,
  });

  const prevEnd = useRef(end);
  useLayoutEffect(() => {
    if (!initialized) {
      return;
    }
    const prevLen = prevMessagesLen.current;
    if (messagesLength > prevLen) {
      const delta = messagesLength - prevLen;
      prevMessagesLen.current = messagesLength;
      let align: 'start' | 'end' = 'start';
      let toIndex: number = start + delta - 1;
      if (prevMessagesLen.current - prevEnd.current < 4) {
        align = 'end';
        toIndex = end + delta;
      }
      console.log({ messagesLength, prevEnd: prevEnd.current, prevLen, end, toIndex, align });
      scrollToIndex(toIndex, { align });
      window.setTimeout(() => scrollToIndex(toIndex, { align }), 160);
    }
    prevEnd.current = end;
  }, [start, end, scrollToIndex, messagesLength, initialized]);
  if (!initialized) {
    return <Loading text="initialize channel" />;
  }
  if (messagesLength === 0 && !displayNewPreviewCompose) {
    return <div css={container}>{loadMore()}</div>;
  }

  const items = virtualItems.map(({ index, measure, size, start }) => {
    return (
      <div
        key={index}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${size}px`,
          transform: `translateY(${start}px)`,
        }}
      >
        <ChatListItems measure={measure} itemIndex={index} />
      </div>
    );
  });
  if (previewIndex && (previewIndex < start || previewIndex > end)) {
    const parent = parentRef.current;
    if (parent !== null) {
      const rect = parent.getBoundingClientRect();
      const style: React.CSSProperties = {
        position: 'fixed',
        width: rect.width,
      };
      if (previewIndex > end) {
        style.bottom = 0;
      }
      items.push(
        <div key={previewIndex} style={style}>
          <ChatListItems itemIndex={previewIndex} />
        </div>
      );
    }
  }

  return (
    <div css={container} ref={parentRef}>
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items}
      </div>
    </div>
  );
}

export default ChatList;
