import * as React from 'react';
import { useEffect, useState } from 'react';
import Title from '../atoms/Title';
import { Space } from '../../api/spaces';
import SpaceCard from '../organisms/SpaceCard';
import { SpaceGrid } from '../atoms/SpaceGrid';
import NewSpaceCard from '../organisms/NewSpaceCard';
import spaceIcon from '../../assets/icons/star-sattelites.svg';
import Icon from '../atoms/Icon';
import { RenderError } from '../molecules/RenderError';
import { useDispatch, useSelector } from '../../store';
import SpaceSearchInput from '../SpaceSearchInput';
import { mY } from '../../styles/atoms';

function ExploreSpace() {
  const isLoggedIn = useSelector((state) => state.profile !== undefined);
  const dispatch = useDispatch();
  const [searchText, setSearchText] = useState('');
  useEffect(() => {
    if (searchText.trim() === '') {
      dispatch({ type: 'LOAD_EXPLORE_SPACE' });
    } else {
      dispatch({ type: 'SEARCH_SPACES', keyword: searchText });
    }
  }, [dispatch, searchText]);
  const result = useSelector((state) => state.ui.exploreSpaceList);
  const spacesMapper = (space: Space) => <SpaceCard key={space.id} space={space} />;
  return (
    <>
      <Title>
        <Icon sprite={spaceIcon} /> 探索位面
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
