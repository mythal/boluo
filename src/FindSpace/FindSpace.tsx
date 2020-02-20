import React from 'react';
import { SpaceList } from './SpaceList';
import { useFetchResult } from '../hooks';
import { get } from '../api/request';

interface Props {}

export const FindSpace: React.FC<Props> = () => {
  const [spaceList] = useFetchResult(() => get('/spaces/list'), []);
  if (spaceList.isErr) {
    return <div>{spaceList.value}</div>;
  }

  return <SpaceList spaces={spaceList.value} />;
};
