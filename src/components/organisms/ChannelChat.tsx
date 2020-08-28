import * as React from 'react';
import { useEffect } from 'react';
import { Id } from '../../utils/id';
import ChatHeader from './ChatHeader';
import ChatList from './ChatList';
import Loading from '../molecules/Loading';
import { chatRight } from '../../styles/atoms';
import { useDispatch, useSelector } from '../../store';
import { CloseChat, loadChat } from '../../actions/chat';

export const useLoadChat = (id: Id, pane: number) => {
  const dispatch = useDispatch();
  useEffect(() => {
    const closeChat: CloseChat = { type: 'CLOSE_CHAT', id, pane };
    dispatch(loadChat(id, pane)).catch(console.error);
    return () => {
      dispatch(closeChat);
    };
  }, [id, dispatch, pane]);
};

interface Props {
  spaceId: Id;
  channelId: Id;
  pane: number;
}

function ChannelChat({ channelId, pane }: Props) {
  useLoadChat(channelId, pane);
  const loading = useSelector((state) => state.chatPane[pane] === undefined);
  if (loading) {
    return (
      <div css={chatRight}>
        <Loading text="load channel data" />
      </div>
    );
  }

  return (
    <React.Fragment>
      <ChatHeader />
      <ChatList />
    </React.Fragment>
  );
}

export default ChannelChat;
