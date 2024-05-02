import React, { FC, useMemo } from 'react';
import { Loading } from '@boluo/ui/Loading';
import { Spinner } from '@boluo/ui/Spinner';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';

interface Props {
  children?: React.ReactNode;
}

export const PaneLoading: FC<Props> = ({ children }) => {
  const header = useMemo(
    () => (
      <PaneHeaderBox withoutDefaultOperators icon={<Spinner />}>
        Loading...
      </PaneHeaderBox>
    ),
    [],
  );
  return (
    <PaneBox grow header={header}>
      <Loading />
      {children}
    </PaneBox>
  );
};
