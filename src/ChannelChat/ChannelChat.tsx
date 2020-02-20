import React, { MutableRefObject, UIEventHandler, useCallback, useEffect, useRef } from 'react';
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

const useSetBottom = (containerRef: MutableRefObject<HTMLDivElement | null>): UIEventHandler => {
  const setBottom = useRef(true);
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!setBottom.current) {
        return;
      }
      if (containerRef.current) {
        containerRef.current.scrollTo(0, containerRef.current.scrollHeight);
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [containerRef]);

  return useCallback(() => {
    setBottom.current = false;
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (container.clientHeight + container.scrollTop === container.scrollHeight) {
      setBottom.current = true;
    }
  }, [containerRef]);
};

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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleScroll = useSetBottom(containerRef);

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
      <div className="h-full overflow-y-scroll" onScroll={handleScroll} ref={containerRef}>
        <MessageList key={id} channelId={id} colorList={colorList} />
      </div>
      <div>{inputArea}</div>
    </div>
  );
};
