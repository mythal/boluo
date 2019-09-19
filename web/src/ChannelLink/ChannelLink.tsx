import React from 'react';
import { useDispatch } from '../App/App';
import { ActionType, OpenChannel } from '../App/actions';

interface Channel {
  id: string;
  name: string;
  title: string;
}

export interface Props {
  channel: Channel;
  opened?: boolean;
}

export const ChannelLink = ({ channel: { id, title, name }, opened }: Props) => {
  const dispatch = useDispatch<OpenChannel>();

  const onClick: React.MouseEventHandler = e => {
    e.preventDefault();
    dispatch({ type: ActionType.OpenChannel, id, title, name });
  };

  const className = opened ? 'ChannelLink opened' : 'ChannelLink';

  return (
    <a href={`/channel/${name}`} className={className} onClick={onClick}>
      {title}
    </a>
  );
};
