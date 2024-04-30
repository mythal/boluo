import { FC } from 'react';
import { PaneBox } from './PaneBox';
import { useQuerySpace } from '../hooks/useQuerySpace';

interface Props {
  spaceId: string;
}

export const PaneSpaceGreeting: FC<Props> = ({ spaceId }) => {
  const { data: space } = useQuerySpace(spaceId);
  return (
    <PaneBox header={null}>
      <div className="p-pane text-text-lighter flex h-full items-center justify-center">{space?.name || '...'}</div>
    </PaneBox>
  );
};
