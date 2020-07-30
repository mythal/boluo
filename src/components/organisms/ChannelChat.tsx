import * as React from 'react';
import { Id } from '@/utils/id';
import ChatHeader from './ChatHeader';
import ChatList from './ChatList';
import ChatCompose from './ChatCompose';
import { ClientEvent } from '@/api/events';
import { useEffect } from 'react';
import Loading from '../molecules/Loading';
import { chatRight } from '@/styles/atoms';
import { useDispatch, useSelector } from '@/store';
import { CloseChat, loadChat } from '@/actions/chat';

export type SendEvent = (event: ClientEvent) => void;

export const sendEvent = (connection: WebSocket): SendEvent => (clientEvent) => {
  connection.send(JSON.stringify(clientEvent));
};

export const useLoadChat = (id: Id) => {
  const dispatch = useDispatch();
  // const connection = useSelector((state) => state.chat?.connection);

  useEffect(() => {
    const closeChat: CloseChat = { type: 'CLOSE_CHAT', id };
    dispatch(loadChat(id)).catch(console.error);
    return () => {
      dispatch(closeChat);
    };
    // if (connection) {
    //   const heartbeatHandler = window.setInterval(() => sendEvent(connection)({ type: 'HEARTBEAT' }), 6000);
    //   return () => {
    //     window.clearInterval(heartbeatHandler);
    //     dispatch(closeChat);
    //   };
    // } else {
    //   return () => {
    //     dispatch(closeChat);
    //   };
    // }
  }, [id, dispatch]);
  // return connection;
};

interface Props {
  spaceId: Id;
  channelId: Id;
}

function ChannelChat({ channelId }: Props) {
  useLoadChat(channelId);
  const loading = useSelector((state) => state.ui.chat === undefined);
  const member = useSelector((state) => state.profile?.channels.get(channelId)?.member);
  if (loading) {
    return (
      <div css={chatRight}>
        <Loading />
      </div>
    );
  }

  return (
    <>
      <ChatHeader member={member} />
      <ChatList />
      {member && <ChatCompose />}
    </>
  );
}

export default ChannelChat;
