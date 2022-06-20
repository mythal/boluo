import * as React from 'react';
import { useEffect } from 'react';
import { Id } from '../../utils/id';
import Header from './Header';
import ChatList from './ChatList';
import Loading from '../molecules/Loading';
import { useDispatch, useSelector } from '../../store';
import Compose from './compose/Compose';
import { chatRight } from './styles';
import { PrivateChat } from './PrivateChat';

interface Props {
  spaceId: Id;
  channelId: Id;
}

function ChannelChat({ channelId }: Props) {
  const loading = useSelector((state) => state.chatStates.get(channelId) === undefined);
  const isPublic = useSelector((state) => state.chatStates.get(channelId)?.channel.isPublic);
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member);
  const dispatch = useDispatch();
  const initialized = useSelector((state) => state.chatStates.get(channelId)?.initialized);
  useEffect(() => {
    dispatch({ type: 'FOCUS_CHANNEL', pane: channelId });
    return () => {
      dispatch({ type: 'UNFOCUS_CHANNEL', pane: channelId });
    };
  }, [channelId, dispatch]);

  if (loading) {
    return (
      <div css={chatRight}>
        <Loading text="load channel data" />
      </div>
    );
  }

  if (!isPublic && !myMember) {
    return (
      <React.Fragment>
        <Header />
        <PrivateChat />
      </React.Fragment>
    );
  }
  return (
    <React.Fragment key={channelId}>
      <Header />
      <ChatList channelId={channelId} />
      {initialized && myMember && <Compose channelId={channelId} member={myMember} />}
    </React.Fragment>
  );
}

export default React.memo(ChannelChat);
