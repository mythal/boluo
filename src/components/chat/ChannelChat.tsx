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

interface Props {
  spaceId: Id;
  channelId: Id;
}

function ChannelChat({ channelId }: Props) {
  const loading = useSelector((state) => state.chatStates.get(channelId) === undefined);
  const isPublic = useSelector((state) => state.chatStates.get(channelId)?.channel.isPublic);
  const initialized = useSelector((state) => state.chatStates.get(channelId)?.initialized);
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member);
  const myPreview = useSelector((state) => {
    if (!myMember) {
      return undefined;
    }
    return state.chatStates.get(channelId)?.itemSet.previews.get(myMember.userId);
  });
  const [, setFocusChannel] = useAtom(focusChannelAtom);
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
    <Provider scope={channelId}>
      <Header />
      <ChatList channelId={channelId} />
      {initialized && myMember && <Compose channelId={channelId} member={myMember} />}
    </Provider>
  );
}

export default ChannelChat;
