import * as React from 'react';
import { useEffect } from 'react';
import { Id } from '../../utils/id';
import Header from './Header';
import ChatList from './ChatList';
import Loading from '../molecules/Loading';
import { chatRight } from '../../styles/atoms';
import { useDispatch, useSelector } from '../../store';
import { CloseChat, loadChat } from '../../actions/chat';
import Compose from './compose/Compose';
import Heartbeat from './Heartbeat';

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
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member);
  const myPreview = useSelector((state) => {
    if (myMember === undefined) {
      return undefined;
    }
    return state.chatPane[pane]?.itemSet.previews.get(myMember!.userId);
  });

  if (loading) {
    return (
      <div css={chatRight}>
        <Loading text="load channel data" />
      </div>
    );
  }

  return (
    <React.Fragment>
      <Header />
      <ChatList />
      {myMember && <Compose channelId={channelId} member={myMember} preview={myPreview?.preview} />}
      {myMember && <Heartbeat />}
    </React.Fragment>
  );
}

export default ChannelChat;
