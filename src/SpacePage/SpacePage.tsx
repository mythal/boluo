import React, { useEffect } from 'react';
import { useFetchResult } from '../hooks';
import { Id } from '../id';
import { Link, useParams } from 'react-router-dom';
import { get } from '../api/request';
import { ChannelItem } from './ChannelItem';
import { setTitle } from '../title';
import { useMy } from '../App/App';
import { CreateChannel } from './CreateChannel';
import { SpaceMembershipButton } from './SpaceMembershipButton';

interface Params {
  id: Id;
}

export const SpacePage: React.FC = () => {
  const { id } = useParams<Params>();
  const my = useMy();
  const member = my.mySpaces.get(id)?.member;
  const isMember = !!member;

  const [spaceWithRelated, refetch] = useFetchResult(() => get('/spaces/query_with_related', { id }), [id]);

  useEffect(() => {
    setTitle(spaceWithRelated.map(data => data.space.name).unwrapOr('?'));
    return setTitle;
  }, [spaceWithRelated]);

  if (spaceWithRelated.isErr) {
    return <div>{spaceWithRelated.value}</div>;
  }
  const { space, channels } = spaceWithRelated.value;

  const channelList = channels.map(channel => (
    <li key={channel.id}>
      <ChannelItem key={channel.id} channel={channel} isSpaceMember={isMember} />
    </li>
  ));

  const createChannel = member?.isAdmin ? (
    <div className="my-4">
      <h2 className="text-lg">创建频道</h2>
      <CreateChannel spaceId={id} onCreated={refetch} />
    </div>
  ) : null;

  return (
    <div className="p-4">
      <div>
        <h1 className="text-2xl">
          <Link to={`/space/${id}`}>{space.name}</Link>
        </h1>
        <div>{space.description}</div>
        <div>
          <SpaceMembershipButton joined={isMember} space={space} />
        </div>
      </div>
      {createChannel}
      <div className="my-4">
        <h2 className="text-lg">频道</h2>
        <ul>{channelList}</ul>
      </div>
    </div>
  );
};
