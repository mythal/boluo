import React from 'react';
import { useQuery } from '@apollo/react-hooks';
import { gql } from 'apollo-boost';
import { CircularProgress, Drawer, ListItem } from '@material-ui/core';
import { Link } from 'react-router-dom';

const CHANNEL_LIST = gql`
  {
    channels {
      id
      title
    }
  }
`;

interface Channel {
  id: string;
  title: string;
}

export interface Props {
  open: boolean;
  drawerClass: string;
  drawerPaperClass: string;
}

export function AppDrawer({ open, drawerClass, drawerPaperClass }: Props) {
  const { loading, data, error } = useQuery<{ channels?: Channel[] }>(CHANNEL_LIST);
  if (error) {
    return <p>Fetch channel list error.</p>;
  } else if (loading || !data || !data.channels) {
    return <CircularProgress />;
  }

  const channelMapper = (channel: Channel, index: number) => {
    return (
      <ListItem key={index} component={Link} to={`/channel/${channel.id}/`} button>
        {channel.title}
      </ListItem>
    );
  };

  return (
    <Drawer className={drawerClass} classes={{ paper: drawerPaperClass }} variant="permanent" anchor="left" open={open}>
      {data.channels.map(channelMapper)}
    </Drawer>
  );
}
