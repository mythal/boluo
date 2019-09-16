import React from 'react';
import gql from 'graphql-tag';
import { useQuery } from '@apollo/react-hooks';
import { usePanes } from '../App/App';
import { ChannelLink } from '../ChannelLink/ChannelLink';

const CHANNEL_LIST = gql`
  {
    channels {
      id
      name
      title
    }
  }
`;

interface Channel {
  id: string;
  name: string;
  title: string;
}

export interface Props {}

export const ChannelList = (props: Props) => {
  const { loading, data, error } = useQuery<{ channels: Channel[] }>(CHANNEL_LIST);
  const panes = usePanes();
  if (error) {
    return <p className="failed">Failed to fetch channel list.</p>;
  } else if (loading) {
    return <p className="loading">Loading...</p>;
  } else if (data === undefined) {
    throw Error();
  }
  const openedChannels = panes
    .filter(pane => pane.type === 'channel')
    .map(pane => pane.id)
    .toSet();

  const listItem = data.channels.map(channel => {
    return (
      <li key={channel.id}>
        <ChannelLink channel={channel} opened={openedChannels.has(channel.id)} />
      </li>
    );
  });
  return <ul>{listItem}</ul>;
};
