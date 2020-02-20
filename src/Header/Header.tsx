import React from 'react';
import { UserZone } from './UserZone';
import { Link } from 'react-router-dom';

interface Props {}

export const Header: React.FC<Props> = () => {
  return (
    <div className="border-b px-1 py-4 flex justify-between">
      <Link to="/" className="text-lg">
        菠萝
      </Link>
      <div className="flex">
        <Link className="mx-2" to="/space/create">
          创建位面
        </Link>
        <UserZone />
      </div>
    </div>
  );
};
