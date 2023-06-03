import { useMemo } from 'react';
import { Loading, Spinner } from 'ui';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';

export const PaneLoading = () => {
  const header = useMemo(() => <PaneHeaderBox icon={<Spinner />}>Loading...</PaneHeaderBox>, []);
  return (
    <PaneBox header={header}>
      <Loading />
    </PaneBox>
  );
};
