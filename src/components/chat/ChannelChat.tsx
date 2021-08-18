import * as React from 'react';
import { useEffect } from 'react';
import { Id } from '../../utils/id';
import Header from './Header';
import ChatList from './ChatList';
import Loading from '../molecules/Loading';
import { useDispatch, useSelector } from '../../store';
import { CloseChat } from '../../actions/chat';
import Compose from './compose/Compose';
import { chatRight } from './styles';

interface Props {
  spaceId: Id;
  channelId: Id;
  pane: Id;
}

function ChannelChat({ channelId, pane }: Props) {
  const loading = useSelector((state) => state.chatStates.get(pane) === undefined);
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member);
  const myPreview = useSelector((state) => {
    if (myMember === undefined) {
      return undefined;
    }
    return state.chatStates.get(pane)?.itemSet.previews.get(myMember!.userId);
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
    </React.Fragment>
  );
}

export default ChannelChat;
