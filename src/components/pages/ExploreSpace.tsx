import * as React from 'react';
import { useEffect } from 'react';
import Title from '../atoms/Title';
import { Space } from '@/api/spaces';
import SpaceCard from '../organisms/SpaceCard';
import { SpaceGrid } from '../atoms/SpaceGrid';
import NewSpaceCard from '../organisms/NewSpaceCard';
import spaceIcon from '@/assets/icons/star-sattelites.svg';
import Icon from '../atoms/Icon';
import { RenderError } from '../molecules/RenderError';
import { useDispatch, useSelector } from '@/store';
import { loadExploreSpace, resetUi } from '@/actions/ui';

function ExploreSpace() {
  const isLoggedIn = useSelector((state) => state.profile !== undefined);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadExploreSpace());
    return () => {
      dispatch(resetUi());
    };
  }, [dispatch]);
  const result = useSelector((state) => state.ui.exploreSpaceList);
  const spacesMapper = (space: Space) => <SpaceCard key={space.id} space={space} />;
  return (
    <>
      <Title>
        <Icon sprite={spaceIcon} /> 探索位面
      </Title>
      {result.isOk ? (
        <SpaceGrid>
          {isLoggedIn && <NewSpaceCard />}
          {result.value.map(spacesMapper)}
        </SpaceGrid>
      ) : (
        <RenderError error={result.value} />
      )}
    </>
  );
}

export default ExploreSpace;
