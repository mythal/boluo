import type { Space } from '@boluo/api';
import Shuffle from '@boluo/icons/Shuffle';
import { useAtom } from 'jotai';
import { type FC } from 'react';
import { sidebarContentStateAtom } from '../../state/ui.atoms';
import Icon from '@boluo/ui/Icon';
import { FormattedMessage } from 'react-intl';
import { usePaneReplace } from '../../hooks/usePaneReplace';
import { ButtonInline } from '@boluo/ui/ButtonInline';

interface Props {
  space: Space;
}

export const SpaceOptions: FC<Props> = ({ space }) => {
  const openPane = usePaneReplace();
  const [sidebarState, setSidebarState] = useAtom(sidebarContentStateAtom);
  const handleClickSpaceName = () => {
    openPane({ type: 'SPACE', spaceId: space.id });
  };

  const handleClickSwitchSpace = () => {
    setSidebarState((prevState) => (prevState === 'SPACES' ? 'CHANNELS' : 'SPACES'));
  };
  return (
    <div className="SpaceOptions h-pane-header group flex w-full items-center gap-1 px-4 text-sm">
      <button
        className="hover:text-text-secondary inline min-w-0 shrink grow items-center gap-2 truncate text-left font-bold"
        onClick={handleClickSpaceName}
      >
        <span className="cursor-pointer">{space.name}</span>
      </button>
      <ButtonInline
        className="flex-none"
        aria-pressed={sidebarState === 'SPACES'}
        onClick={handleClickSwitchSpace}
      >
        <Icon icon={Shuffle} />
        <span className="ml-1">
          <FormattedMessage defaultMessage="Switch" />
        </span>
      </ButtonInline>
    </div>
  );
};
