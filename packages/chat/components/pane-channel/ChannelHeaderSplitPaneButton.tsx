import { SplitHorizontal } from 'icons';
import { FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from 'ui/Button';
import { usePaneSplit } from '../../hooks/usePaneSplit';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';

export const ChannelHeaderSplitPaneButton: FC = () => {
  const intl = useIntl();
  const dup = usePaneSplit();
  return (
    <SidebarHeaderButton onClick={dup} title={intl.formatMessage({ defaultMessage: 'Split pane' })}>
      <SplitHorizontal className="rotate-90 md:rotate-0" />
      <span className="hidden @4xl:inline">
        <FormattedMessage defaultMessage="Split" />
      </span>
    </SidebarHeaderButton>
  );
};
