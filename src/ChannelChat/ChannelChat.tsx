import React, { useEffect } from 'react';
import { Id } from '../id';
import { useParams } from 'react-router-dom';
import { useFetchResult } from '../hooks';
import { get } from '../api/request';
import { setTitle } from '../title';
import { ChannelChatHeader } from './ChannelChatHeader';
import { useMe, useMy } from '../App/App';
import { MessageList } from './MessageList';
import { MessageInputArea } from './MessageInputArea';
import { GUEST } from '../App/states';

interface Params {
  id: Id;
}

interface Props {}

export const ChannelChat: React.FC<Props> = () => {
  const { id } = useParams<Params>();
  const me = useMe();
  const my = useMy();
  const member = my.myChannels.get(id)?.member;
  const [channelWithRelated] = useFetchResult(() => get('/channels/query_with_related', { id }), [id]);

  useEffect(() => {
    setTitle(channelWithRelated.map(data => data.channel.name).unwrapOr('?'));
    return setTitle;
  }, [channelWithRelated]);

  if (channelWithRelated.isErr) {
    return <div>{channelWithRelated.value}</div>;
  }
  const { channel, colorList } = channelWithRelated.value;
  if (member?.textColor) {
    colorList[member.userId] = member.textColor;
  }
  const inputArea =
    me === GUEST || !member ? null : <MessageInputArea key={id} me={me} member={member} channel={channel} />;

  return (
    <div className="h-screen flex flex-col">
      <ChannelChatHeader channel={channel} member={member} />
      <div className="h-full overflow-y-scroll">
        <MessageList key={id} channelId={id} colorList={colorList} />
      </div>
      <div>{inputArea}</div>
    </div>
  );
};
