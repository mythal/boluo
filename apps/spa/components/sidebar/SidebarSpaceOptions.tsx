import type { Space, User } from '@boluo/api';
import { ChevronRight, Shuffle } from '@boluo/icons';
import { useAtom, useAtomValue } from 'jotai';
import { useMemo, type FC } from 'react';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { sidebarContentStateAtom } from '../../state/ui.atoms';
import Icon from '@boluo/ui/Icon';
import clsx from 'clsx';
import { selectAtom } from 'jotai/utils';
import { panesAtom } from '../../state/view.atoms';

interface Props {
  space: Space;
  currentUser: User | null | undefined;
}

export const SpaceOptions: FC<Props> = ({ space, currentUser }) => {
  const togglePane = usePaneToggle();
  const [sidebarState, setSidebarState] = useAtom(sidebarContentStateAtom);
  const opened = useAtomValue(
    useMemo(
      () => selectAtom(panesAtom, (panes) => panes.some((pane) => pane.type === 'SPACE' && pane.spaceId === space.id)),
      [space.id],
    ),
  );
  const handleToggleSpacePane = () => {
    togglePane({ type: 'SPACE', spaceId: space.id });
  };

  const handleClickSwitchSpace = () => {
    setSidebarState((prevState) => (prevState === 'SPACES' ? 'CHANNELS' : 'SPACES'));
  };
  return (
    <div className="">
      <div className="h-pane-header group flex w-full items-center gap-2 px-4">
        <button
          className="hover:text-text-light min-w-0 flex-grow items-center gap-2 text-left text-base font-bold"
          onClick={handleToggleSpacePane}
        >
          {space.name}
          {!opened && <Icon icon={ChevronRight} />}
        </button>
        <button
          className={clsx(
            'h-8 w-8 rounded-sm',
            sidebarState === 'SPACES' ? 'bg-sidebar-folder-active-bg' : 'hover:bg-sidebar-folder-hover-bg',
          )}
          onClick={handleClickSwitchSpace}
        >
          <Icon icon={Shuffle} />
        </button>
      </div>
    </div>
  );
};
