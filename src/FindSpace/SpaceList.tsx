import React, { useState } from 'react';
import { SpaceItem } from './SpaceItem';
import { InputField } from '../From/InputField';
import { Space } from '../api/spaces';

interface Props {
  spaces: Space[];
}

const spaceFilter = (filter: string) => {
  const keywords = filter.split(' ');
  return (space: Space): boolean => {
    for (const keyword of keywords) {
      if (space.name.indexOf(keyword) === -1) {
        return false;
      }
    }
    return true;
  };
};

export const SpaceList: React.FC<Props> = ({ spaces }) => {
  const [filter, setFilter] = useState('');

  const spaceList = spaces.filter(spaceFilter(filter)).map(space => <SpaceItem key={space.id} space={space} />);

  return (
    <div>
      <div>
        <InputField value={filter} onChange={setFilter} label="过滤" />
      </div>
      <div>{spaceList}</div>
    </div>
  );
};
