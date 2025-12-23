import Close from '@boluo/icons/Close';
import type { FC } from 'react';
import { useIntl } from 'react-intl';
import { usePaneClose } from '../hooks/usePaneClose';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';

export const ClosePaneButton: FC = () => {
  const intl = useIntl();
  const close = usePaneClose();
  return (
    <PaneHeaderButton
      onClick={(e) => {
        e.stopPropagation();
        close();
      }}
      aria-label={intl.formatMessage({ defaultMessage: 'Close the pane' })}
    >
      <Close />
    </PaneHeaderButton>
  );
};
