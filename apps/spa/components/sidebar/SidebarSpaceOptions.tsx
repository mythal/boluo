import type { Space, User } from '@boluo/api';
import { Shuffle } from '@boluo/icons';
import { useAtom } from 'jotai';
import type { FC } from 'react';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { sidebarContentStateAtom } from '../../state/ui.atoms';
import Icon from '@boluo/ui/Icon';
import clsx from 'clsx';

interface Props {
  space: Space;
  currentUser: User | null | undefined;
}

export const SpaceOptions: FC<Props> = ({ space, currentUser }) => {
  const togglePane = usePaneToggle();
  const [sidebarState, setSidebarState] = useAtom(sidebarContentStateAtom);
  const handleToggleSpacePane = () => {
    togglePane({ type: 'SPACE', spaceId: space.id });
  };

  const handleClickSwitchSpace = () => {
    setSidebarState((prevState) => (prevState === 'SPACES' ? 'CHANNELS' : 'SPACES'));
  };
  return (
    <div className="">
      <div className="group flex w-full items-center gap-2 px-3 py-2">
        <button className="min-w-0 flex-grow items-center gap-2 text-left text-base " onClick={handleToggleSpacePane}>
          {space.name}
        </button>
        <button
          className={clsx(
            'h-8 w-8 rounded-md border',
            sidebarState === 'SPACES' ? 'border-surface-500' : 'hover:border-surface-300',
          )}
          onClick={handleClickSwitchSpace}
        >
          <Icon icon={Shuffle} />
        </button>
      </div>
    </div>
  );
};
