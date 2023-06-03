import { Close } from 'icons';
import type { FC } from 'react';
import { useTransition } from 'react';
import { useIntl } from 'react-intl';
import { Button } from 'ui';
import { usePaneClose } from '../hooks/usePaneClose';

export const ClosePaneButton: FC = () => {
  const intl = useIntl();
  const close = usePaneClose();
  return (
    <Button
      data-small
      onClick={(e) => {
        e.stopPropagation();
        close();
      }}
      title={intl.formatMessage({ defaultMessage: 'Close pane' })}
    >
      <Close />
    </Button>
  );
};
