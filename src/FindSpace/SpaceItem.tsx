import React from 'react';
import { Space } from '../api/spaces';
import { Link } from 'react-router-dom';

interface Props {
  space: Space;
}

export const SpaceItem: React.FC<Props> = ({ space }) => {
  return (
    <div className="py-1 my-1 border-b max-w-md">
      <h1 className="text-base">
        <Link to={`/space/${space.id}`}>{space.name}</Link>
      </h1>
      <div className="text-xs">{space.description}</div>
    </div>
  );
};
