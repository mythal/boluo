import { Close } from 'boluo-icons';
import type { FC } from 'react';
import { useTransition } from 'react';
import { useIntl } from 'react-intl';
import { Button } from 'ui';
import { useClosePane } from '../../state/panes';

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
