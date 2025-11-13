import { ScrollText } from '@boluo/icons';
import { type FC, type MouseEventHandler, useCallback, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { usePaneKey } from '../../hooks/usePaneKey';
import { atom, useAtomValue } from 'jotai';
import { panesAtom } from '../../state/view.atoms';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import Icon from '@boluo/ui/Icon';

interface Props {
  channelId: string;
}

export const ChannelExportButton: FC<Props> = ({ channelId }) => {
  const toggleChild = usePaneToggle({ child: true });
  const paneKey = usePaneKey();
  const opened = useAtomValue(
    useMemo(
      () =>
        atom((read) => {
          const panes = read(panesAtom);
          const pane = panes.find(
            (pane) =>
              (pane.key === paneKey &&
                pane.child?.type === 'CHANNEL_EXPORT' &&
                pane.child.channelId === channelId) ||
              (pane.type === 'CHANNEL_EXPORT' && pane.channelId === channelId),
          );
          return Boolean(pane);
        }),
      [channelId, paneKey],
    ),
  );
  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.stopPropagation();
      toggleChild({ type: 'CHANNEL_EXPORT', channelId });
    },
    [toggleChild, channelId],
  );
  return (
    <SidebarHeaderButton size="small" onClick={handleClick} active={opened}>
      <Icon icon={ScrollText} />
      <span className="hidden @xl:inline">
        <FormattedMessage defaultMessage="Export" />
      </span>
    </SidebarHeaderButton>
  );
};
