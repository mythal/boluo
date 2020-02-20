import React from 'react';
import { UserZone } from './UserZone';
import { Link } from 'react-router-dom';

interface Props {}

export const Header: React.FC<Props> = () => {
  return (
    <div>
      <Link to="/">菠萝</Link> <Link to="/space/create">创建位面</Link>
      <UserZone />
    </div>
  );
};
