import * as React from 'react';
import Title from '../atoms/Title';
import { ProfileState } from '../../reducers/profile';
import SpaceCard from '../organisms/SpaceCard';
import { SpaceGrid } from '../atoms/SpaceGrid';
import NewSpaceCard from '../organisms/NewSpaceCard';
import planetConquest from '../../assets/icons/planet-conquest.svg';
import Icon from '../atoms/Icon';

interface Props {
  profile: ProfileState;
}

function My({ profile }: Props) {
  const spaces = profile.spaces.valueSeq().map(({ space }) => <SpaceCard key={space.id} space={space} />);
  return (
    <>
      <Title>
        <Icon sprite={planetConquest} /> 我在的位面
      </Title>
      <SpaceGrid>
        <NewSpaceCard />
        {spaces}
      </SpaceGrid>
    </>
  );
}

export default My;
