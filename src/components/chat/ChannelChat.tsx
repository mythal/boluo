import React, { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '../../api/request';
import { Dispatch, useChat, useDispatch, useMy } from '../Provider';
import { useParams } from 'react-router-dom';
import { ChannelEventReceived, LoadChat } from '../../states/actions';
import { Id } from '../../id';
import { connect as apiConnect } from '../../api/connect';
import { ChannelEvent, NewPreviewEvent } from '../../api/events';
import { Loading } from '../Loading';
import { LoadMoreButton } from './LoadMoreButton';
import { Compose } from './Compose';
import { Chat } from '../../states/chat';
import { errorText } from '../../api/error';
import { ChatList } from './ChatList';
import { DayDivider } from './DayDivider';
import { ChannelMember } from '../../api/channels';
import { SpaceMember } from '../../api/spaces';

export interface Member {
  channel?: ChannelMember;
  space?: SpaceMember;
}

const MemberContext = React.createContext<Member>({});

export const useMember = () => React.useContext<Member>(MemberContext);

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
    const interval = window.setInterval(loadChat, 16000);
    return () => {
      window.clearInterval(interval);
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

const useAutoScroll = (chatListRef: React.RefObject<HTMLDivElement>) => {
  const scrollEnd = useRef<number>(0);

  useEffect(() => {
    if (!chatListRef.current) {
      return;
    }
    const chatList = chatListRef.current;
    const lockSpan = chatList.clientHeight >> 1;
    if (chatList.scrollTop < lockSpan || scrollEnd.current < lockSpan) {
      chatList.scrollTo(0, chatList.scrollHeight - chatList.clientHeight - scrollEnd.current);
    }
  });

  return useCallback(() => {
    if (chatListRef.current === null) {
      return;
    }
    const chatList = chatListRef.current;
    scrollEnd.current = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight;
  }, [chatListRef]);
};

export const ChannelChat: React.FC<Props> = () => {
  const { id } = useParams<Params>();
  const dispatch = useDispatch();
  const chatListRef = useRef<HTMLDivElement>(null);
  const my = useMy();
  const [chat, sendAction, connError] = useLoadChat(id, dispatch);
  const onScroll = useAutoScroll(chatListRef);

  if (chat === undefined) {
    return (
      <div>
        <Loading />
      </div>
    );
  }
  const member = my === 'GUEST' ? undefined : my.channels.get(id)?.member;
  const spaceMember = my === 'GUEST' ? undefined : my.spaces.get(chat.channel.spaceId)?.member;
  return (
    <MemberContext.Provider value={{ channel: member, space: spaceMember }}>
      <div className="flex flex-col w-full h-full">
        {connError && <div className="p-1 border-b text-xl text-center bg-red-800 text-white">{connError}</div>}
        <div className="h-px flex-auto overflow-y-scroll overflow-x-hidden" ref={chatListRef} onScroll={onScroll}>
          {chat.finished ? (
            <DayDivider date={new Date(chat.messageBefore)} />
          ) : (
            <LoadMoreButton channelId={id} before={chat.messageBefore} />
          )}
          <ChatList itemList={chat.itemList.reverse()} colorMap={chat.colorMap} />
        </div>

        {my !== 'GUEST' && member && (
          <Compose member={member} sendAction={sendAction} channelId={id} profile={my.profile} />
        )}
      </div>
    </MemberContext.Provider>
  );
};
