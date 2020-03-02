import React, { useCallback, useEffect, useRef } from 'react';
import { get } from '../../api/request';
import { Dispatch, useChat, useDispatch, useMy } from '../App';
import { useParams } from 'react-router-dom';
import { ChannelEventReceived, LoadChat, NewAlert } from '../../states/actions';
import { throwErr } from '../../helper';
import { Id } from '../../id';
import { connect } from '../../api/connect';
import { ChannelEvent, NewPreviewEvent } from '../../api/events';
import { Loading } from '../Loading';
import { LoadMoreButton } from './LoadMoreButton';
import { Compose } from './Compose';
import { MessageItem } from './MessageItem';
import { DayDivider } from './DayDivider';
import { Chat, ChatItem } from '../../states/chat';

interface Params {
  id: string;
}

interface Props {}

const REFETCH_CHAT_INFO_TIME = 30000;

export type SendAction = (preview: NewPreviewEvent) => void;

export const useLoadChat = (id: Id, dispatch: Dispatch): [Chat | undefined, SendAction] => {
  const throwE = throwErr(dispatch);
  const chat = useChat();

  const loadChat = useCallback(async () => {
    const result = await get('/channels/query_with_related', { id });
    if (result.isErr) {
      return throwE(result.value);
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

    const timeout = window.setTimeout(loadChat, REFETCH_CHAT_INFO_TIME);
    return () => {
      window.clearTimeout(timeout);
      dispatch({ type: 'CLOSE_CHAT', id });
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const connection = useRef<WebSocket | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const warning = (e: any) => {
    console.warn(e);
    dispatch<NewAlert>({
      type: 'NEW_ALERT',
      level: 'ERROR',
      message: '和服务器的连接出现错误，请刷新一下试试',
    });
  };

  useEffect(() => {
    const id = chat?.channel.id;
    if (id !== undefined) {
      const after = new Date().getTime() - 24 * 60 * 60 * 1000;
      connection.current = connect(id, after);
      connection.current.onmessage = wsMsg => {
        const event = JSON.parse(wsMsg.data) as ChannelEvent;
        dispatch<ChannelEventReceived>({ type: 'CHANNEL_EVENT_RECEIVED', event });
      };
      connection.current.onerror = warning;
      connection.current.onclose = warning;
    }
    return () => {
      if (connection.current) {
        connection.current.onclose = null;
        connection.current.close();
        connection.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.channel.id]);

  const sendAction = useCallback<SendAction>(action => connection.current?.send(JSON.stringify(action)), []);

  return [chat, sendAction];
};

export const ChannelChat: React.FC<Props> = () => {
  const { id } = useParams<Params>();
  const dispatch = useDispatch();
  const my = useMy();
  const [chat, sendAction] = useLoadChat(id, dispatch);
  const member = my === 'GUEST' ? undefined : my.channels.get(id)?.member;

  if (chat === undefined) {
    return (
      <div>
        <Loading />
      </div>
    );
  }
  const { colorMap } = chat;
  const { previewMap } = chat;

  const chatItemMapper = (item: ChatItem) => {
    if (item.type === 'MESSAGE') {
      if (item.message.deleted) {
        return null;
      }
      const { id, text, entities, name, isAction, isMaster, inGame, seed, created } = item.message;
      const color = colorMap.get(item.message.senderId);
      return (
        <MessageItem
          key={id}
          isPreview={false}
          text={text}
          entities={entities}
          name={name}
          isAction={isAction}
          isMaster={isMaster}
          inGame={inGame}
          color={color}
          seed={seed}
          time={created}
        />
      );
    } else if (item.type === 'PREVIEW') {
      if (previewMap.get(item.preview.senderId) !== item.preview.id) {
        return null;
      }
      const { id, text, entities, name, isAction, isMaster, inGame, start } = item.preview;
      const color = colorMap.get(item.preview.senderId);
      return (
        <MessageItem
          key={'preview-' + id}
          isPreview={true}
          text={text}
          entities={entities}
          name={name}
          isAction={isAction}
          isMaster={isMaster}
          inGame={inGame}
          color={color}
          time={start}
        />
      );
    } else {
      return <DayDivider key={item.date.getTime()} date={item.date} />;
    }
  };

  const messageList = chat.itemList.map(chatItemMapper);
  return (
    <div className="flex flex-col w-full h-full">
      <div className="message-list w-full">
        {messageList}
        {!chat.finished && <LoadMoreButton channelId={id} before={chat.oldest} dispatch={dispatch} />}
      </div>

      {my !== 'GUEST' && member && (
        <Compose member={member} sendAction={sendAction} channelId={id} profile={my.profile} />
      )}
    </div>
  );
};
