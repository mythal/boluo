import { type FC } from 'react';
import { PaneBox } from './PaneBox';
import { useQuerySpace } from '@boluo/hooks/useQuerySpace';
import { GreetingHeader } from './GreetingHeader';

interface Props {
  spaceId: string;
}

export const PaneSpaceGreeting: FC<Props> = ({ spaceId }) => {
  const { data: space } = useQuerySpace(spaceId);
  return (
    <PaneBox header={null} initSizeLevel={1}>
      <div className="p-pane h-full">
        <GreetingHeader />
        <div className="text-text-muted flex h-full items-center justify-center">
          {space?.name || '...'}
        </div>
      </div>
    </PaneBox>
  );
};
