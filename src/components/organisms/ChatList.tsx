import * as React from 'react';
import { useContext, useEffect, useRef } from 'react';
import { css } from '@emotion/core';
import { useSelector } from '@/store';
import LoadMoreButton from '@/components/molecules/LoadMoreButton';
import styled from '@emotion/styled';
import Loading from '@/components/molecules/Loading';
import { bgColor } from '@/styles/colors';
import { AutoSizer, CellMeasurer, CellMeasurerCache, List, ListRowRenderer, ScrollParams } from 'react-virtualized';
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
  // If shouldn't display compose dummy preview, `myId` is undefended.
  const myId = useSelector((state) => {
    if (!state.profile || !state.chat) {
      return undefined;
    }
    const myId = state.profile.user.id;
    const member = state.profile.channels.get(state.chat.channel.id);
    const preview = state.chat.itemSet.previews.get(myId);
    return member && !preview ? myId : undefined;
  });
  const scrollToBottom = useRef<boolean>(true);

  useClearCache();

  useEffect(() => {
    setTimeout(() => {
      if (scrollToBottom) {
        virtualizedList.current?.scrollToRow(messagesLength - 1);
      }
    }, 500);
  });

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
                shouldShowComposePreview={index === messagesLength - 1 ? myId : undefined}
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
                scrollToAlignment="start"
                onScroll={({ clientHeight, scrollHeight, scrollTop }: ScrollParams) => {
                  // https://stackoverflow.com/a/33189270/1137004
                  const lockSpan = clientHeight >> 1;
                  const scrollEnd = scrollHeight - scrollTop - clientHeight;
                  scrollToBottom.current = scrollTop < lockSpan || scrollEnd < lockSpan;
                }}
                // onScroll={({clientHeight, scrollHeight, scrollTop}: ScrollParams) => {
                //     // https://stackoverflow.com/a/33189270/1137004
                //
                //     // console.log(scrollToBottom);
                //     const lockSpan = clientHeight >> 1;
                //
                //     const scrollEnd = scrollHeight - scrollTop - clientHeight;
                //     if (scrollTop > 10 && scrollEnd > 10 && scrollToBottom) {
                //       console.log(scrollToBottom);
                //       setScrollToBottom(false);
                //     }
                //   //   canScrollToEnd.current = scrollEnd < lockSpan;
                // }}
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
