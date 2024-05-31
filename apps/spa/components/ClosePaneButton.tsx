import { Close } from '@boluo/icons';
import type { FC } from 'react';
import { useIntl } from 'react-intl';
import { usePaneClose } from '../hooks/usePaneClose';
import { SidebarHeaderButton } from './sidebar/SidebarHeaderButton';

export const ClosePaneButton: FC = () => {
  const intl = useIntl();
  const close = usePaneClose();
  return (
    <SidebarHeaderButton
      onClick={(e) => {
        e.stopPropagation();
        close();
      }}
      aria-label={intl.formatMessage({ defaultMessage: 'Close the pane' })}
    >
      <Close />
    </SidebarHeaderButton>
  );
};
