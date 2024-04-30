import { Settings } from '@boluo/icons';
import { useAtom } from 'jotai';
import { FC, MouseEventHandler, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { panesAtom } from '../../state/view.atoms';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { usePaneReplace } from '../../hooks/usePaneReplace';

interface Props {
  channelId: string;
}

export const ChannelSettingsButton: FC<Props> = ({ channelId }) => {
  const replacePane = usePaneReplace();
  const [panes, setPanes] = useAtom(panesAtom);
  const settingsPaneKey = panes.find((pane) => pane.type === 'CHANNEL_SETTINGS' && pane.channelId === channelId)?.key;
  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.stopPropagation();
      if (settingsPaneKey != null) {
        setPanes((panes) => panes.filter((pane) => pane.key !== settingsPaneKey));
      } else {
        replacePane({ type: 'CHANNEL_SETTINGS', channelId });
      }
    },
    [settingsPaneKey, setPanes, replacePane, channelId],
  );
  return (
    <SidebarHeaderButton onClick={handleClick} active={settingsPaneKey != null}>
      <Settings />
      <FormattedMessage defaultMessage="Channel Settings" />
    </SidebarHeaderButton>
  );
};
