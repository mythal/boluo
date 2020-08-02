import * as React from 'react';
import { useEffect } from 'react';
import { Id } from '@/utils/id';
import ChatHeader from './ChatHeader';
import ChatList from './ChatList';
import Loading from '../molecules/Loading';
import { chatRight } from '@/styles/atoms';
import { useDispatch, useSelector } from '@/store';
import { CloseChat, loadChat } from '@/actions/chat';
import ChatMemberList from '@/components/organisms/ChatMemberList';

export const useLoadChat = (id: Id) => {
  const dispatch = useDispatch();
  useEffect(() => {
    const closeChat: CloseChat = { type: 'CLOSE_CHAT', id };
    dispatch(loadChat(id)).catch(console.error);
    return () => {
      dispatch(closeChat);
    };
  }, [id, dispatch]);
};

interface Props {
  spaceId: Id;
  channelId: Id;
}

function ChannelChat({ channelId }: Props) {
  useLoadChat(channelId);
  const loading = useSelector((state) => state.chat === undefined);
  if (loading) {
    return (
      <div css={chatRight}>
        <Loading />
      </div>
    );
  }

  return (
    <>
      <ChatHeader />
      <ChatList />
      <ChatMemberList />
    </>
  );
}

export default ChannelChat;
