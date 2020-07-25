import * as React from 'react';
import Title from '../atoms/Title';
import { useFetchResult } from '../../hooks';
import { Space } from '../../api/spaces';
import { get } from '../../api/request';
import SpaceCard from '../organisms/SpaceCard';
import { SpaceGrid } from '../atoms/SpaceGrid';
import NewSpaceCard from '../organisms/NewSpaceCard';
import spaceIcon from '../../assets/icons/star-sattelites.svg';
import Icon from '../atoms/Icon';
import { RenderError } from '../molecules/RenderError';

function ExploreSpace() {
  const [result] = useFetchResult<Space[]>(() => get('/spaces/list'), []);
  const spacesMapper = (space: Space) => <SpaceCard key={space.id} space={space} />;
  return (
    <>
      <Title>
        <Icon sprite={spaceIcon} /> 探索位面
      </Title>
      {result.isOk ? (
        <SpaceGrid>
          <NewSpaceCard />
          {result.value.map(spacesMapper)}
        </SpaceGrid>
      ) : (
        <RenderError error={result.value} />
      )}
    </>
  );
}

export default ExploreSpace;
