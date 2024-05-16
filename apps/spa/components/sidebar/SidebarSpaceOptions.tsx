import type { Space, User } from '@boluo/api';
import { Shuffle } from '@boluo/icons';
import { useAtom } from 'jotai';
import { type FC } from 'react';
import { sidebarContentStateAtom } from '../../state/ui.atoms';
import Icon from '@boluo/ui/Icon';
import clsx from 'clsx';
import { FormattedMessage } from 'react-intl';
import { usePaneReplace } from '../../hooks/usePaneReplace';
import { SidebarButton } from './SidebarButton';

interface Props {
  space: Space;
  currentUser: User | null | undefined;
}

export const SpaceOptions: FC<Props> = ({ space, currentUser }) => {
  const openPane = usePaneReplace();
  const [sidebarState, setSidebarState] = useAtom(sidebarContentStateAtom);
  const handleClickSpaceName = () => {
    openPane({ type: 'SPACE', spaceId: space.id });
  };

  const handleClickSwitchSpace = () => {
    setSidebarState((prevState) => (prevState === 'SPACES' ? 'CHANNELS' : 'SPACES'));
  };
  return (
    <div className="h-pane-header group flex w-full items-center gap-1 px-4 text-sm">
      <button
        className="hover:text-text-light inline min-w-0 flex-grow items-center gap-2 truncate text-left font-bold"
        onClick={handleClickSpaceName}
      >
        {space.name}
      </button>
      <button
        className={clsx(
          'inline-block flex-none rounded-sm px-1 py-0.5 text-sm',
          sidebarState === 'SPACES' ? 'bg-sidebar-folder-active-bg' : 'hover:bg-sidebar-folder-hover-bg',
        )}
        onClick={handleClickSwitchSpace}
      >
        <Icon icon={Shuffle} />
        <span className="ml-1 text-xs">
          <FormattedMessage defaultMessage="Spaces" />
        </span>
      </button>
      <SidebarButton />
    </div>
  );
};
