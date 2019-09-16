import React from 'react';
import { ChannelList } from '../ChannelList/ChannelList';
import { Link } from 'react-router-dom';

export interface Props {}

export const Sidebar = (props: Props) => {
  return (
    <aside className="Sidebar">
      <div className="Sidebar-home">
        <Link to="/">Boluo</Link>
      </div>
      <ChannelList />
    </aside>
  );
};
