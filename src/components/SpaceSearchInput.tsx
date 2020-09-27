import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import Input from './atoms/Input';
import Icon from './atoms/Icon';
import searchSpaces from '../assets/icons/search-spaces.svg';
import { flex, mR } from '../styles/atoms';

interface Props {
  search: (value: string) => void;
  className?: string;
}

function SpaceSearchInput({ search, className }: Props) {
  const compositing = useRef(false);
  const [searchValue, setSearchValue] = useState('');
  const timeout = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => {
      if (!compositing.current) {
        search(searchValue);
      }
    }, 200);
  }, [search, searchValue]);

  return (
    <div css={flex} className={className}>
      <Icon css={mR(2)} sprite={searchSpaces} />
      <Input
        value={searchValue}
        placeholder="搜索公开位面"
        onChange={(e) => setSearchValue(e.target.value)}
        onCompositionStart={() => (compositing.current = true)}
        onCompositionEnd={() => (compositing.current = false)}
      />
    </div>
  );
}

export default SpaceSearchInput;
