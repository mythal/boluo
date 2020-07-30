import * as React from 'react';
import Title from '../atoms/Title';
import SpaceCard from '../organisms/SpaceCard';
import { SpaceGrid } from '../atoms/SpaceGrid';
import NewSpaceCard from '../organisms/NewSpaceCard';
import planetConquest from '@/assets/icons/planet-conquest.svg';
import Icon from '../atoms/Icon';
import { useSelector } from '@/store';

function My() {
  const spaces = useSelector((state) => state.profile!.spaces);
  const cards = spaces.valueSeq().map(({ space }) => <SpaceCard key={space.id} space={space} />);
  return (
    <>
      <Title>
        <Icon sprite={planetConquest} /> 我在的位面
      </Title>
      <SpaceGrid>
        <NewSpaceCard />
        {cards}
      </SpaceGrid>
    </>
  );
}

export default My;
