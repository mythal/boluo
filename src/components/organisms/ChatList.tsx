import * as React from 'react';
import { useEffect, useRef } from 'react';
import { css } from '@emotion/core';
import { useSelector } from '@/store';
import LoadMoreButton, { LoadMoreContainer } from '@/components/molecules/LoadMoreButton';
import Loading from '@/components/molecules/Loading';
import { bgColor } from '@/styles/colors';
import { AutoSizer, CellMeasurer, CellMeasurerCache, List, ListRowRenderer } from 'react-virtualized';
import { ChatItems, NoMessages } from '@/components/molecules/ChatListItem';

const container = css`
  grid-area: list;
  background-color: ${bgColor};
  overflow-x: hidden;
  overflow-y: scroll;
`;

const defaultHeight = 60;
export const cache = new CellMeasurerCache({
  defaultHeight,
  fixedWidth: true,
});

function loadMore() {
  return (
    <LoadMoreContainer>
      <LoadMoreButton />
    </LoadMoreContainer>
  );
}

function useClearCache() {
  const timeout = useRef<number | undefined>(undefined);
  useEffect(() => {
    const onResize = () => {
      if (timeout.current) {
        window.clearTimeout(timeout.current);
      }
      timeout.current = window.setTimeout(() => cache.clearAll(), 100);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timeout.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);
}

function ChatList() {
  const initialized = useSelector((state) => state.chat!.initialized);
  const messagesLength = useSelector((state) => state.chat!.itemSet.messages.size);
  const chatListRef = useRef<HTMLDivElement>(null);
  const virtualizedList = useRef<List>(null);
  const reverseStopIndex = useRef<number>(0);
  const previousMessageLength = useRef<number>(messagesLength);
  const shouldScrollToStopIndex = useRef(false);

  if (previousMessageLength.current !== messagesLength && messagesLength > 0) {
    shouldScrollToStopIndex.current = true;
  }

  useClearCache();

  if (!initialized) {
    return <Loading text="initialize channel" />;
  }
  if (messagesLength === 0) {
    return (
      <div css={container}>
        {loadMore()}
        <NoMessages />
      </div>
    );
  }

  type RegisterChild = ((element: Element | null) => void) | undefined;

  const renderer: ListRowRenderer = ({ index, key, style, parent }) => {
    return (
      <CellMeasurer cache={cache} columnIndex={0} key={key} parent={parent} rowIndex={index}>
        {({ registerChild, measure }) => {
          return (
            <div key={key} ref={registerChild as RegisterChild} style={style}>
              {index === 0 && loadMore()}
              <ChatItems
                messageIndex={index}
                measure={measure}
                listRefOnlyIfLast={index === messagesLength - 1 ? virtualizedList : undefined}
              />
            </div>
          );
        }}
      </CellMeasurer>
    );
  };
  return (
    <div css={container} ref={chatListRef}>
      <AutoSizer>
        {({ height, width }) => {
          return (
            <List
              height={height}
              overscanRowCount={4}
              rowCount={messagesLength}
              deferredMeasurementCache={cache}
              estimatedRowSize={defaultHeight}
              rowHeight={cache.rowHeight}
              rowRenderer={renderer}
              width={width}
              style={{ outline: 'none' }}
              scrollToAlignment="end"
              onRowsRendered={({ stopIndex }) => {
                if (shouldScrollToStopIndex.current) {
                  const currentReverseStopIndex = messagesLength - 1 - stopIndex;
                  if (currentReverseStopIndex !== reverseStopIndex.current) {
                    setTimeout(() =>
                      virtualizedList.current?.scrollToRow(messagesLength - 1 - reverseStopIndex.current)
                    );
                  } else {
                    shouldScrollToStopIndex.current = false;
                  }
                  return;
                } else {
                  reverseStopIndex.current = messagesLength - 1 - stopIndex;
                }
              }}
              ref={virtualizedList}
            />
          );
        }}
      </AutoSizer>
    </div>
  );
}

export default ChatList;
