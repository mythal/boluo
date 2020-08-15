import * as React from 'react';
import { useContext, useEffect, useRef } from 'react';
import { css } from '@emotion/core';
import { useSelector } from '@/store';
import LoadMoreButton from '@/components/molecules/LoadMoreButton';
import styled from '@emotion/styled';
import Loading from '@/components/molecules/Loading';
import { bgColor } from '@/styles/colors';
import { AutoSizer, CellMeasurer, CellMeasurerCache, List, ListRowRenderer } from 'react-virtualized';
import { pY } from '@/styles/atoms';
import ChatListItem from '@/components/molecules/ChatListItem';

const container = css`
  grid-area: list;
  background-color: ${bgColor};
  overflow-x: hidden;
  overflow-y: scroll;
`;

const LoadMoreContainer = styled.div`
  background-color: ${bgColor};
  display: flex;
  ${pY(2)};
  align-items: center;
  justify-content: center;
`;

const ChatListContext = React.createContext<React.RefObject<HTMLDivElement | null>>(React.createRef());

export function useChatList(): React.RefObject<HTMLDivElement | null> {
  return useContext(ChatListContext);
}

const defaultHeight = 60;
const cache = new CellMeasurerCache({
  defaultHeight,
  fixedWidth: true,
});

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
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const initialized = useSelector((state) => state.chat!.initialized);
  const messagesLength = useSelector((state) => state.chat!.itemSet.messages.size);
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
  const chatListRef = useRef<HTMLDivElement>(null);
  const virtualizedList = useRef<List>(null);
  const reverseStopIndex = useRef<number>(0);
  const stopState = useRef<'END' | 'TO_END' | 'FLOAT'>('TO_END');

  useClearCache();

  if (!initialized) {
    return <Loading />;
  }

  type RegisterChild = ((element: Element | null) => void) | undefined;

  const renderer: ListRowRenderer = ({ index, key, style, parent }) => {
    return (
      <CellMeasurer cache={cache} columnIndex={0} key={key} parent={parent} rowIndex={index}>
        {({ registerChild, measure }) => {
          return (
            <div key={key} ref={registerChild as RegisterChild} style={style}>
              {index === 0 && (
                <LoadMoreContainer>
                  <LoadMoreButton />
                </LoadMoreContainer>
              )}
              <ChatListItem
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
      <ChatListContext.Provider value={chatListRef}>
        <AutoSizer>
          {({ height, width }) => {
            return (
              <List
                height={height}
                overscanRowCount={2}
                rowCount={messagesLength}
                deferredMeasurementCache={cache}
                estimatedRowSize={defaultHeight}
                rowHeight={cache.rowHeight}
                rowRenderer={renderer}
                width={width}
                style={{ outline: 'none' }}
                scrollToAlignment="start"
                onRowsRendered={({ stopIndex }) => {
                  if (stopState.current === 'TO_END') {
                    if (stopIndex !== messagesLength - 1) {
                      virtualizedList.current?.scrollToRow(stopIndex + 1);
                    } else {
                      reverseStopIndex.current = 0;
                      stopState.current = 'END';
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
      </ChatListContext.Provider>
    </div>
  );
}

export default ChatList;
