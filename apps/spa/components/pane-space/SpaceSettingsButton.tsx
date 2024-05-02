import { FC, useCallback, useMemo } from 'react';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { Settings } from '@boluo/icons';
import { FormattedMessage } from 'react-intl';
import { usePaneOpenChild } from '../../hooks/usePaneOpenChild';
import { usePaneKey } from '../../hooks/usePaneKey';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { panesAtom } from '../../state/view.atoms';
import { usePaneClearChild } from '../../hooks/usePaneCloseChild';

export const SpaceSettingsButton: FC<{ spaceId: string }> = ({ spaceId }) => {
  const openChild = usePaneOpenChild();
  const clearChild = usePaneClearChild();
  const paneKey = usePaneKey();
  const opened = useAtomValue(
    useMemo(
      () =>
        selectAtom(panesAtom, (panes) => {
          return panes.some((pane) => pane.key === paneKey && pane.child?.type === 'SPACE_SETTINGS');
        }),
      [paneKey],
    ),
  );
  const handleClick = useCallback(() => {
    if (opened) {
      clearChild();
      return;
    }
    openChild({ type: 'SPACE_SETTINGS', spaceId });
  }, [clearChild, openChild, opened, spaceId]);

  return (
    <SidebarHeaderButton icon={<Settings />} onClick={handleClick} active={opened}>
      <span className="@xl:inline hidden">
        <FormattedMessage defaultMessage="Space Settings" />
      </span>
    </SidebarHeaderButton>
  );
};
