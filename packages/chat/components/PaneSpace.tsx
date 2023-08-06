import { FC } from 'react';
import { useQuerySpace } from '../hooks/useQuerySpace';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';
import { PaneLoading } from './PaneLoading';

interface Props {
  spaceId: string;
}

export const PaneSpace: FC<Props> = ({ spaceId }) => {
  const { data: space, isLoading } = useQuerySpace(spaceId);
  if (isLoading || !space) {
    return <PaneLoading />;
  }
  return (
    <PaneBox header={<PaneHeaderBox>{space.name}</PaneHeaderBox>}>
      <div className="p-4">
        <div>{space.name}</div>
      </div>
    </PaneBox>
  );
};
