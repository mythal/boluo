import React from 'react';
import { Space } from '../api/spaces';
import { Link } from 'react-router-dom';

interface Props {
  space: Space;
}

export const SpaceItem: React.FC<Props> = ({ space }) => {
  return (
    <div>
      <h1>
        <Link to={`/space/${space.id}`}>{space.name}</Link>
      </h1>
      <div>{space.description}</div>
    </div>
  );
};
