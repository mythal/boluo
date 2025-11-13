import { type Channel } from '@boluo/api';
import { MoonStar, Settings } from '@boluo/icons';
import { type FC, useCallback, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { PaneHeaderBox } from '../PaneHeaderBox';
import Icon from '@boluo/ui/Icon';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { usePaneKey } from '../../hooks/usePaneKey';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { panesAtom } from '../../state/view.atoms';

interface Props {
  channel: Channel;
}

const SpaceSettingsPaneButton: FC<{ spaceId: string }> = ({ spaceId }) => {
  const toggleChild = usePaneToggle({ child: true });
  const paneKey = usePaneKey();
  const opened = useAtomValue(
    useMemo(
      () =>
        selectAtom(panesAtom, (panes) => {
          if (paneKey == null) {
            return false;
          }
          const pane = panes.find((entry) => entry.key === paneKey);
          return (
            pane?.child?.type === 'SPACE_SETTINGS' && pane.child.spaceId === spaceId
          );
        }),
      [paneKey, spaceId],
    ),
  );
  const handleClick = useCallback(() => {
    toggleChild({ type: 'SPACE_SETTINGS', spaceId });
  }, [spaceId, toggleChild]);
  return (
    <SidebarHeaderButton size="small" onClick={handleClick} active={opened}>
      <Icon icon={MoonStar} />
      <span className="hidden @xl:inline">
        <FormattedMessage defaultMessage="Space Settings" />
      </span>
    </SidebarHeaderButton>
  );
};

export const PaneChannelSettingsHeader: FC<Props> = ({ channel }) => {
  return (
    <PaneHeaderBox icon={<Settings />} operators={<SpaceSettingsPaneButton spaceId={channel.spaceId} />}>
      <span className="overflow-hidden overflow-ellipsis whitespace-nowrap">
        <FormattedMessage
          defaultMessage='Settings of "{channelName}" Channel'
          values={{ channelName: channel.name }}
        />
      </span>
    </PaneHeaderBox>
  );
};
