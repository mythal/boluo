import React, { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '../../api/request';
import { Dispatch, useChat, useDispatch, useProfile } from '../Provider';
import { useParams } from 'react-router-dom';
import { Id } from '../../utils';
import { connect as apiConnect } from '../../api/connect';
import { ChannelEvent, ClientEvent } from '../../api/events';
import { Loading } from '../Loading';
import { LoadMoreButton } from './LoadMoreButton';
import { Compose } from './Compose';
import { errorText } from '../../api/error';
import { ChatList } from './ChatList';
import { DayDivider } from './DayDivider';
import { ChannelMember } from '../../api/channels';
import { SpaceMember } from '../../api/spaces';
import { Header } from './Header';
import { MemberList } from './MemberList';
import { ChannelEventReceived, LoadChat } from '../../actions/chat';
import { ChatState } from '../../reducers/chat';

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

export type SendAction = (preview: ClientEvent) => void;

export const useLoadChat = (id: Id, dispatch: Dispatch): [ChatState | undefined, SendAction, string | null] => {
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
    // const interval = window.setInterval(loadChat, 16000);
    return () => {
      // window.clearInterval(interval);
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
      connection.current.onmessage = (wsMsg) => {
        const event = JSON.parse(wsMsg.data) as ChannelEvent;
        dispatch<ChannelEventReceived>({ type: 'CHANNEL_EVENT_RECEIVED', event });
      };
      connection.current.onerror = (e) => {
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

  const sendAction = useCallback<SendAction>((action) => connection.current?.send(JSON.stringify(action)), []);

  const heartbeat = useCallback(() => {
    if (document.visibilityState === 'visible') {
      sendAction({ type: 'HEARTBEAT', mailbox: id });
    }
  }, [id, sendAction]);

  useEffect(() => {
    const heartbeatHandler = window.setInterval(heartbeat, 2000);
    return () => window.clearInterval(heartbeatHandler);
  }, [sendAction, heartbeat]);

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
  const profile = useProfile();
  const [chat, sendAction, connError] = useLoadChat(id, dispatch);
  const [isMemberListOpen, setIsMemberListOpen] = useState<boolean>(false);
  const onScroll = useAutoScroll(chatListRef);

  if (chat === undefined) {
    return (
      <div>
        <Loading />
      </div>
    );
  }
  const member = profile?.channels.get(id)?.member;
  const spaceMember = profile?.spaces.get(chat.channel.spaceId)?.member;
  return (
    <MemberContext.Provider value={{ channel: member, space: spaceMember }}>
      <div className="flex flex-col w-full h-full">
        <Header
          chat={chat}
          isMemberListOpen={isMemberListOpen}
          toggleMemberList={() => setIsMemberListOpen((open) => !open)}
        />
        {connError && <div className="p-1 border-b text-xl text-center bg-red-800 text-white">{connError}</div>}
        <div className="h-px flex-auto flex">
          <div className="overflow-y-scroll overflow-x-hidden h-full flex-grow" ref={chatListRef} onScroll={onScroll}>
            {chat.finished ? (
              <DayDivider date={new Date(chat.messageBefore)} />
            ) : (
              <LoadMoreButton channelId={id} before={chat.messageBefore} />
            )}
            <ChatList itemList={chat.itemList.reverse()} colorMap={chat.colorMap} />
          </div>
          {isMemberListOpen && (
            <div className="h-full flex-grow-0 w-32 border-l overflow-y-scroll">
              <MemberList members={chat.members} heartbeatMap={chat.heartbeatMap} />
            </div>
          )}
        </div>

        {profile && member && (
          <Compose
            member={member}
            sendAction={sendAction}
            channelId={id}
            profile={profile.user}
            defaultDiceType={chat.channel.defaultDiceType}
          />
        )}
      </div>
    </MemberContext.Provider>
  );
};
