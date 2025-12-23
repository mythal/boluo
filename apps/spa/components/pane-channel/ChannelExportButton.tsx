import ScrollText from '@boluo/icons/ScrollText';
import { type FC, type MouseEventHandler, useCallback, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import { usePaneKey } from '../../hooks/usePaneKey';
import { atom, useAtomValue } from 'jotai';
import { panesAtom } from '../../state/view.atoms';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import Icon from '@boluo/ui/Icon';

interface Props {
  channelId: string;
}

export const ChannelExportButton: FC<Props> = ({ channelId }) => {
  const toggleChild = usePaneToggle({ child: '1/3' });
  const paneKey = usePaneKey();
  const opened = useAtomValue(
    useMemo(
      () =>
        atom((read) => {
          const panes = read(panesAtom);
          const pane = panes.find(
            (pane) =>
              (pane.key === paneKey &&
                pane.child?.pane.type === 'CHANNEL_EXPORT' &&
                pane.child.pane.channelId === channelId) ||
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
    <PaneHeaderButton onClick={handleClick} active={opened}>
      <Icon icon={ScrollText} />
      <span className="hidden @xl:inline">
        <FormattedMessage defaultMessage="Export" />
      </span>
    </PaneHeaderButton>
  );
};
