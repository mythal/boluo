import React, { type FC, useMemo } from 'react';
import { Loading } from '@boluo/ui/Loading';
import { Spinner } from '@boluo/ui/Spinner';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';
import { LoadingText } from '@boluo/ui/LoadingText';

interface Props {
  children?: React.ReactNode;
  initSizeLevel?: number;
}

export const PaneLoading: FC<Props> = ({ children, initSizeLevel }) => {
  const header = useMemo(
    () => (
      <PaneHeaderBox withoutDefaultOperators icon={<Spinner />}>
        <LoadingText />
      </PaneHeaderBox>
    ),
    [],
  );
  return (
    <PaneBox initSizeLevel={initSizeLevel} header={header}>
      <Loading />
      {children}
    </PaneBox>
  );
};
