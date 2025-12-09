import Plus from '@boluo/icons/Plus';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import Icon from '@boluo/ui/Icon';
import { useAtomValue } from 'jotai';
import { FC, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { panesAtom } from '../../state/view.atoms';
import { findPane } from '../../state/view.utils';

export const SidebarChannelsHeaderNewChannel: FC<{ spaceId: string }> = ({ spaceId }) => {
  const panes = useAtomValue(panesAtom);
  const togglePane = usePaneToggle();
  const intl = useIntl();
  const newChannelLabel = intl.formatMessage({ defaultMessage: 'New Channel' });
  const isCreateChannelPaneOpened = useMemo(
    () => findPane(panes, (pane) => pane.type === 'CREATE_CHANNEL') !== null,
    [panes],
  );

  const handleToggleCreateChannelPane = () => {
    togglePane({ type: 'CREATE_CHANNEL', spaceId });
  };

  return (
    <ButtonInline
      aria-label={newChannelLabel}
      title={newChannelLabel}
      onClick={handleToggleCreateChannelPane}
      aria-pressed={isCreateChannelPaneOpened}
    >
      <Icon icon={Plus} />
    </ButtonInline>
  );
};
