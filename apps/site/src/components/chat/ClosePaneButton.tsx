import { Close } from 'icons';
import type { FC } from 'react';
import { useTransition } from 'react';
import { useIntl } from 'react-intl';
import { Button } from 'ui';
import { useClosePane } from '../../state/chat-view';

export const ClosePaneButton: FC = () => {
  const intl = useIntl();
  const close = useClosePane();
  const [, starTransition] = useTransition();
  return (
    <Button
      data-small
      onClick={() => starTransition(close)}
      title={intl.formatMessage({ defaultMessage: 'Close pane' })}
    >
      <Close />
    </Button>
  );
};
