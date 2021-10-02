import * as React from 'react';
import { useEffect } from 'react';
import { Id } from '../../utils/id';
import Header from './Header';
import ChatList from './ChatList';
import Loading from '../molecules/Loading';
import { useSelector } from '../../store';
import Compose from './compose/Compose';
import { chatRight } from './styles';
import { useAtom } from 'jotai';
import { focusChannelAtom } from '../../states/focusChannel';
import { PrivateChat } from './PrivateChat';
import { Provider } from 'jotai';
import { useInitializeCompose } from './compose/useInitializeCompose';

interface Props {
  spaceId: Id;
  channelId: Id;
}

function ChannelChat({ channelId }: Props) {
  const loading = useSelector((state) => state.chatStates.get(channelId) === undefined);
  const isPublic = useSelector((state) => state.chatStates.get(channelId)?.channel.isPublic);
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member);
  const [, setFocusChannel] = useAtom(focusChannelAtom);
  const initialized = useInitializeCompose(channelId);
  useEffect(() => {
    setFocusChannel((prev) => prev.add(channelId));
    return () => setFocusChannel((prev) => prev.remove(channelId));
  }, [channelId, setFocusChannel]);

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
    <React.Fragment>
      <Header />
      <ChatList channelId={channelId} />
      {initialized && myMember && <Compose channelId={channelId} member={myMember} />}
    </React.Fragment>
  );
}

export default React.memo(ChannelChat);
