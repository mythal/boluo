import { Settings } from 'icons';
import { useAtom } from 'jotai';
import { FC, MouseEventHandler, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { usePaneKey } from '../../hooks/usePaneKey';
import { panesAtom } from '../../state/view.atoms';

interface Props {
  channelId: string;
}

export const ChannelSettingsButton: FC<Props> = ({ channelId }) => {
  const currentPaneKey = usePaneKey();
  const addPane = usePaneAdd();
  const [panes, setPanes] = useAtom(panesAtom);
  const settingsPaneKey = panes
    .find((pane) => pane.type === 'CHANNEL_SETTINGS' && pane.channelId === channelId)
    ?.key;
  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    e.stopPropagation();
    if (settingsPaneKey != null) {
      setPanes(panes => panes.filter((pane) => pane.key !== settingsPaneKey));
    } else {
      const position = currentPaneKey ? { refKey: currentPaneKey, before: true } : undefined;
      addPane({ type: 'CHANNEL_SETTINGS', channelId }, position);
    }
  }, [settingsPaneKey, setPanes, currentPaneKey, addPane, channelId]);
  return (
    <Button onClick={handleClick} data-type="switch" data-on={settingsPaneKey != null}>
      <Settings />
      <FormattedMessage defaultMessage="Channel Settings" />
    </Button>
  );
};
