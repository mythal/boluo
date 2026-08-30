import * as React from 'react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from '../../store';
import { type Id } from '../../utils/id';
import Loading from '../molecules/Loading';
import ChatList from './ChatList';
import Compose from './compose/Compose';
import Header from './Header';
import { PrivateChat } from './PrivateChat';

interface Props {
  spaceId: Id;
  channelId: Id;
  focus: () => void;
}

function ChannelChat({ channelId, focus }: Props) {
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
      <div className="[grid-row:header-start/compose-end]">
        <Loading text="load channel data" />
      </div>
    );
  }

  if (!isPublic && !myMember) {
    return (
      <React.Fragment>
        <Header focus={focus} />
        <PrivateChat />
      </React.Fragment>
    );
  }
  return (
    <React.Fragment key={channelId}>
      <Header focus={focus} />
      <ChatList channelId={channelId} focus={focus} />
      {initialized && myMember ? (
        <Compose channelId={channelId} member={myMember} />
      ) : (
        <div className="[grid-row:compose-start/compose-end] flex items-center justify-center px-[1em] py-[0.5em]">
          你现在没有权限发言
        </div>
      )}
    </React.Fragment>
  );
}

export default React.memo(ChannelChat);
