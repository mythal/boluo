import * as React from 'react';
import { useEffect, useState } from 'react';
import { loadExploreSpace, searchSpaces } from '../../actions';
import { type Space } from '../../api/spaces';
import StarSattelites from '../../assets/icons/star-sattelites.svg';
import { useDispatch, useSelector } from '../../store';
import { mY } from '../../styles/atoms';
import Icon from '../atoms/Icon';
import { SpaceGrid } from '../atoms/SpaceGrid';
import Title from '../atoms/Title';
import { RenderError } from '../molecules/RenderError';
import NewSpaceCard from '../organisms/NewSpaceCard';
import SpaceCard from '../organisms/SpaceCard';
import SpaceSearchInput from '../SpaceSearchInput';

function ExploreSpace() {
  const isLoggedIn = useSelector((state) => state.profile !== undefined);
  const dispatch = useDispatch();
  const [searchText, setSearchText] = useState('');
  useEffect(() => {
    if (searchText.trim() === '') {
      dispatch(loadExploreSpace());
    } else {
      dispatch(searchSpaces(searchText));
    }
  }, [dispatch, searchText]);
  const result = useSelector((state) => state.ui.exploreSpaceList);
  const spacesMapper = (space: Space) => <SpaceCard key={space.id} space={space} />;
  return (
    <>
      <Title>
        <Icon icon={StarSattelites} /> 探索位面
      </Title>
      <SpaceSearchInput css={mY(4)} search={setSearchText} />
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
