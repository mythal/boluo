import { type FC, useCallback, useMemo } from 'react';
import Settings from '@boluo/icons/Settings';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import { FormattedMessage } from 'react-intl';
import { usePaneKey } from '../../hooks/usePaneKey';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { panesAtom } from '../../state/view.atoms';
import { usePaneToggle } from '../../hooks/usePaneToggle';

export const SpaceSettingsButton: FC<{ spaceId: string }> = ({ spaceId }) => {
  const toggleChild = usePaneToggle({ child: '2/3' });
  const paneKey = usePaneKey();
  const opened = useAtomValue(
    useMemo(
      () =>
        selectAtom(panesAtom, (panes) => {
          return panes.some(
            (pane) => pane.key === paneKey && pane.child?.pane.type === 'SPACE_SETTINGS',
          );
        }),
      [paneKey],
    ),
  );
  const handleClick = useCallback(() => {
    toggleChild({ type: 'SPACE_SETTINGS', spaceId });
  }, [spaceId, toggleChild]);

  return (
    <PaneHeaderButton icon={<Settings />} onClick={handleClick} active={opened}>
      <span className="hidden text-xs @xl:inline">
        <FormattedMessage defaultMessage="Space Settings" />
      </span>
    </PaneHeaderButton>
  );
};
