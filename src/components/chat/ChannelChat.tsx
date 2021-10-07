import * as React from 'react';
import { useEffect } from 'react';
import { Id } from '../../utils/id';
import Header from './Header';
import ChatList from './ChatList';
import Loading from '../molecules/Loading';
import { useSelector } from '../../store';
import Compose from './compose/Compose';
import { chatRight } from './styles';
import { useAtom } from 'jotai/esm';
import { focusChannelAtom } from '../../states/focusChannel';
import { PrivateChat } from './PrivateChat';

interface Props {
  spaceId: Id;
  channelId: Id;
}

function ChannelChat({ channelId }: Props) {
  const isPublic = useSelector((state) => state.chatStates.get(channelId)?.channel.isPublic);
  const loading = useSelector((state) => state.chatStates.get(channelId) === undefined);
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member);
  const myPreview = useSelector((state) => {
    if (myMember === undefined) {
      return undefined;
    }
    return state.chatStates.get(channelId)?.itemSet.previews.get(myMember!.userId);
  });
  const [, setFocusChannel] = useAtom(focusChannelAtom);
  useEffect(() => {
    setFocusChannel((prev) => prev.add(channelId));
    return () => setFocusChannel((prev) => prev.remove(channelId));
  }, [channelId, setFocusChannel]);

  if (!isPublic && !myMember) {
    return (
      <React.Fragment>
        <Header />
        <PrivateChat />
      </React.Fragment>
    );
  }

  if (loading) {
    return (
      <div css={chatRight}>
        <Loading text="load channel data" />
      </div>
    );
  }

  return (
    <React.Fragment key={channelId}>
      <Header />
      <ChatList />
      {myMember && <Compose channelId={channelId} member={myMember} preview={myPreview?.preview} />}
    </React.Fragment>
  );
}

export default ChannelChat;
