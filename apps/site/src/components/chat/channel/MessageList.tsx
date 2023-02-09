import type { Message } from 'boluo-api';
import { ChevronsDown } from 'boluo-icons';
import type { FC } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import type { VirtuosoHandle } from 'react-virtuoso';
import { Virtuoso } from 'react-virtuoso';
import { Button } from 'ui';
import { useContextSelector } from 'use-context-selector';
import { get } from '../../../api/browser';
import type { ChannelState } from '../../../state/channel';
import { ChatContext, useChatDispatch } from '../../../state/chat';
import { MessageListHeader } from './MessageListHeader';
import { MessageListItem } from './MessageListItem';

interface Props {
  channelId: string;
  className: string;
}

interface ViewProps {
  channelId: string;
  messages: Message[];
  className: string;
  state: ChannelState['state'];
}

const START_INDEX = Number.MAX_SAFE_INTEGER - 10000000;
const SHOW_BOTTOM_BUTTON_TIMEOUT = 500;
const LOAD_MESSAGE_LIMIT = 51;

const MessageListView: FC<ViewProps> = ({ channelId, messages, className }) => {
  const dispatch = useChatDispatch();
  const [finished, setFinished] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const showButtonTimeoutRef = useRef<number | undefined>(undefined);
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const loadMore = useCallback(async () => {
    let before: number | null = null;
    if (finished) {
      return;
    }
    if (messages.length > 0) {
      before = messages[0]!.pos;
    }
    const result = await get('/messages/by_channel', { channelId, before, limit: LOAD_MESSAGE_LIMIT });
    if (result.isErr) {
      // TODO: show error
      return;
    }
    const newMessages = result.some;
    if (newMessages.length < LOAD_MESSAGE_LIMIT) {
      setFinished(true);
    }
    setFirstItemIndex(prevFirstItemIndex => prevFirstItemIndex - newMessages.length);
    dispatch({ type: 'MESSAGES_LOADED', before, channelId, messages: newMessages });
  }, [channelId, dispatch, finished, messages]);

  // load initial messages.
  useEffect(() => {
    if (messages.length === 0 && !finished) {
      void loadMore();
    }
  }, [finished, loadMore, messages.length]);

  useEffect(() => () => window.clearTimeout(showButtonTimeoutRef.current));

  const handleBottomStateChange = (bottom: boolean) => {
    window.clearTimeout(showButtonTimeoutRef.current);
    if (bottom) {
      setShowButton(false);
    } else {
      showButtonTimeoutRef.current = window.setTimeout(() => setShowButton(true), SHOW_BOTTOM_BUTTON_TIMEOUT);
    }
  };

  return (
    <div className={className}>
      <Virtuoso
        firstItemIndex={firstItemIndex}
        ref={virtuosoRef}
        components={{ Header: MessageListHeader }}
        initialTopMostItemIndex={messages.length - 1}
        data={messages}
        totalCount={messages.length}
        startReached={loadMore}
        followOutput="auto"
        itemContent={(_, message) => <MessageListItem message={message} className="py-2 px-4" />}
        atBottomStateChange={handleBottomStateChange}
      />
      {showButton && (
        <Button
          onClick={() => virtuosoRef.current!.scrollToIndex({ index: messages.length - 1, behavior: 'smooth' })}
          className="absolute right-6 bottom-4 text-lg"
        >
          <ChevronsDown />
        </Button>
      )}
    </div>
  );
};

export const MessageList: FC<Props> = ({ channelId, className }) => {
  const messages = useContextSelector(ChatContext, (state) => state.channels[channelId]?.messages);
  const state = useContextSelector(ChatContext, (state) => state.channels[channelId]?.state);
  if (state !== 'INITIALIZED' || messages === undefined) {
    return (
      <div className={className}>
        <FormattedMessage defaultMessage="Loading" />
      </div>
    );
  }
  return (
    <MessageListView
      messages={messages}
      state={state}
      channelId={channelId}
      className={className}
    />
  );
};
