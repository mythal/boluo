import React, { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '../../api/request';
import { Dispatch, useChat, useDispatch, useMy } from '../App';
import { useParams } from 'react-router-dom';
import { ChannelEventReceived, LoadChat } from '../../states/actions';
import { Id } from '../../id';
import { connect as apiConnect } from '../../api/connect';
import { ChannelEvent, NewPreviewEvent } from '../../api/events';
import { Loading } from '../Loading';
import { LoadMoreButton } from './LoadMoreButton';
import { Compose } from './Compose';
import { Chat } from '../../states/chat';
import { ChatListItem } from './ChatListItem';
import { errorText } from '../../api/error';

interface Params {
  id: string;
}

interface Props {}

export type SendAction = (preview: NewPreviewEvent) => void;

export const useLoadChat = (id: Id, dispatch: Dispatch): [Chat | undefined, SendAction, string | null] => {
  const [error, setError] = useState<string | null>('正在连接...');
  const chat = useChat();

  const loadChat = useCallback(async () => {
    const result = await get('/channels/query_with_related', { id });
    if (result.isErr) {
      return setError(errorText(result.value));
    }
    const channelWithRelated = result.value;
    dispatch<LoadChat>({
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
    if (chat !== undefined) {
      connection.current = apiConnect(chat.channel.id, chat.eventAfter);
      connection.current.onopen = () => setError(null);
      connection.current.onmessage = wsMsg => {
        const event = JSON.parse(wsMsg.data) as ChannelEvent;
        dispatch<ChannelEventReceived>({ type: 'CHANNEL_EVENT_RECEIVED', event });
      };
      connection.current.onerror = e => {
        console.warn(e);
        setError('和服务器的连接出现错误');
        window.clearTimeout(reconnectionTimeout.current);
        reconnectionTimeout.current = window.setTimeout(connect, 1000);
      };
      connection.current.onclose = () => {
        window.clearTimeout(reconnectionTimeout.current);
        reconnectionTimeout.current = window.setTimeout(connect, 1000);
      };
    }
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

  const sendAction = useCallback<SendAction>(action => connection.current?.send(JSON.stringify(action)), []);

  return [chat, sendAction, error];
};

export const ChannelChat: React.FC<Props> = () => {
  const { id } = useParams<Params>();
  const dispatch = useDispatch();
  const my = useMy();
  const [chat, sendAction, connError] = useLoadChat(id, dispatch);
  const member = my === 'GUEST' ? undefined : my.channels.get(id)?.member;

  if (chat === undefined) {
    return (
      <div>
        <Loading />
      </div>
    );
  }
  const { colorMap } = chat;
  const messageList = chat.itemList.map(item => <ChatListItem key={item.id} item={item} colorMap={colorMap} />);
  return (
    <div className="flex flex-col w-full h-full ">
      {connError && <div className="p-1 border-b text-xl text-center bg-red-800 text-white">{connError}</div>}
      <div className="flex flex-1-0 overflow-y-scroll h-full">
        <div className="bg-gray-100 flex-1 flex flex-col-reverse w-px overflow-x-hidden">
          {messageList}
          {!chat.finished && <LoadMoreButton channelId={id} before={chat.messageBefore} dispatch={dispatch} />}
        </div>
      </div>

      {my !== 'GUEST' && member && (
        <Compose member={member} sendAction={sendAction} channelId={id} profile={my.profile} />
      )}
    </div>
  );
};
