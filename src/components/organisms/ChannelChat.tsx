import * as React from 'react';
import { Id } from '../../utils/id';
import ChatHeader from './ChatHeader';
import ChatList from './ChatList';
import ChatCompose from './ChatCompose';
import { Dispatch, useChat, useDispatch, useProfile } from '../Provider';
import { ChatState } from '../../reducers/chat';
import { ChannelEvent, ClientEvent } from '../../api/events';
import { useCallback, useEffect, useRef } from 'react';
import { get } from '../../api/request';
import { connect as apiConnect } from '../../api/connect';
import Loading from '../molecules/Loading';
import { throwErr } from '../../utils/errors';
import { showError } from '../../actions/information';
import { chatRight } from '../../styles/atoms';

export type SendEvent = (preview: ClientEvent) => void;

export const useChannel = (id: Id, dispatch: Dispatch): [ChatState | undefined, SendEvent] => {
  const chat = useChat();
  const throwE = throwErr(dispatch);

  const loadChat = useCallback(async () => {
    const result = await get('/channels/query_with_related', { id });
    if (result.isErr) {
      throwE(result.value);
      return;
    }
    const channelWithRelated = result.value;
    dispatch({
      type: 'LOAD_CHAT',
      channelWithRelated,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadChat().catch(console.warn);
    return () => {
      dispatch({ type: 'CLOSE_CHAT', id });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const connection = useRef<WebSocket | null>(null);
  const reconnectionTimeout = useRef<number | undefined>(undefined);

  const connect = () => {
    if (chat === undefined) {
      return;
    }
    connection.current = apiConnect(chat.channel.id, 'CHANNEL', chat.eventAfter);
    connection.current.onmessage = (wsMsg) => {
      const event = JSON.parse(wsMsg.data) as ChannelEvent;
      dispatch({ type: 'CHANNEL_EVENT_RECEIVED', event });
    };
    connection.current.onerror = (e) => {
      console.warn(e);
      dispatch(showError(<span>和服务器的连接出现错误</span>));
      window.clearTimeout(reconnectionTimeout.current);
      reconnectionTimeout.current = window.setTimeout(connect, 1000);
    };
    connection.current.onclose = () => {
      window.clearTimeout(reconnectionTimeout.current);
      reconnectionTimeout.current = window.setTimeout(connect, 1000);
    };
  };

  useEffect(() => {
    connect();
    return () => {
      window.clearTimeout(reconnectionTimeout.current);
      reconnectionTimeout.current = undefined;
      if (connection.current) {
        connection.current.onclose = null;
        connection.current.close();
        connection.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.channel.id]);

  const sendEvent = useCallback<SendEvent>((action) => connection.current?.send(JSON.stringify(action)), []);

  const heartbeat = useCallback(() => {
    if (document.visibilityState === 'visible') {
      sendEvent({ type: 'HEARTBEAT' });
    }
  }, [sendEvent]);

  useEffect(() => {
    const heartbeatHandler = window.setInterval(heartbeat, 6000);
    return () => window.clearInterval(heartbeatHandler);
  }, [sendEvent, heartbeat]);

  return [chat, sendEvent];
};

interface Props {
  spaceId: Id;
  channelId: Id;
}

function ChannelChat({ channelId }: Props) {
  const dispatch = useDispatch();
  const [chat, sendEvent] = useChannel(channelId, dispatch);
  const profile = useProfile();
  if (!chat) {
    return (
      <div css={chatRight}>
        <Loading />
      </div>
    );
  }
  const member = profile?.channels.get(chat.channel.id)?.member;

  return (
    <>
      <ChatHeader channel={chat.channel} member={member} />
      <ChatList itemList={chat.itemList} />
      {profile && member && <ChatCompose sendEvent={sendEvent} profile={profile} channel={chat.channel} />}
    </>
  );
}

export default ChannelChat;
