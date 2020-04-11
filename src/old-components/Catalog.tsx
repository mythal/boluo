import React from 'react';
import { useFetchResult } from '../hooks';
import { get } from '../api/request';
import { Space } from '../api/spaces';
import { Link } from 'react-router-dom';

export const SpaceItem: React.FC<{ space: Space }> = ({ space }) => {
  return (
    <li className="sm:w-full md:w-48 block sm:inline-block p-3 mr-2 mb-2 border rounded shadow">
      <div className="text-xl">
        <Link className="link" to={`/space/${space.id}`}>
          {space.name}
        </Link>
      </div>
      <div className="hidden md:block">{space.description}</div>
    </li>
  );
};

export const Catalog: React.FC = () => {
  const [spacesResult] = useFetchResult(() => get('/spaces/list'), []);
  if (spacesResult.isErr) {
    return <div>{spacesResult.value}</div>;
  }
  const spaceList = spacesResult.value.map((space) => <SpaceItem key={space.id} space={space} />);
  return (
    <div className="p-4">
      <h1 className="text-3xl">目录</h1>
      <p>这是一个临时页面</p>

      <ul className="my-4">{spaceList}</ul>
    </div>
  );
};
