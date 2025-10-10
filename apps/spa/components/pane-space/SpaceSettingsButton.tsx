import { type FC, useCallback, useMemo } from 'react';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { Settings } from '@boluo/icons';
import { FormattedMessage } from 'react-intl';
import { usePaneKey } from '../../hooks/usePaneKey';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { panesAtom } from '../../state/view.atoms';
import { usePaneToggle } from '../../hooks/usePaneToggle';

export const SpaceSettingsButton: FC<{ spaceId: string }> = ({ spaceId }) => {
  const toggleChild = usePaneToggle({ child: true });
  const paneKey = usePaneKey();
  const opened = useAtomValue(
    useMemo(
      () =>
        selectAtom(panesAtom, (panes) => {
          return panes.some(
            (pane) => pane.key === paneKey && pane.child?.type === 'SPACE_SETTINGS',
          );
        }),
      [paneKey],
    ),
  );
  const handleClick = useCallback(() => {
    toggleChild({ type: 'SPACE_SETTINGS', spaceId });
  }, [spaceId, toggleChild]);

  return (
    <SidebarHeaderButton icon={<Settings />} onClick={handleClick} active={opened}>
      <span className="hidden text-xs @xl:inline">
        <FormattedMessage defaultMessage="Space Settings" />
      </span>
    </SidebarHeaderButton>
  );
};
