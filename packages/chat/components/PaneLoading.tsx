import { useMemo } from 'react';
import { Loading } from '@boluo/ui/Loading';
import { Spinner } from '@boluo/ui/Spinner';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';

export const PaneLoading = () => {
  const header = useMemo(
    () => (
      <PaneHeaderBox withoutDefaultOperators icon={<Spinner />}>
        Loading...
      </PaneHeaderBox>
    ),
    [],
  );
  return (
    <PaneBox header={header}>
      <Loading />
    </PaneBox>
  );
};
