import { SplitHorizontal } from 'icons';
import { FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from 'ui';
import { usePaneSplit } from '../../hooks/usePaneSplit';

export const ChannelHeaderSplitPaneButton: FC = () => {
  const intl = useIntl();
  const dup = usePaneSplit();
  return (
    <Button
      data-small
      onClick={dup}
      title={intl.formatMessage({ defaultMessage: 'Split pane' })}
    >
      <SplitHorizontal className="rotate-90 md:rotate-0" />
      <span className="hidden @4xl:inline">
        <FormattedMessage defaultMessage="Split" />
      </span>
    </Button>
  );
};
