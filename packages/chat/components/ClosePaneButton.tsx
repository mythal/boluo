import { Close } from 'icons';
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
      title={intl.formatMessage({ defaultMessage: 'Close pane' })}
    >
      <Close />
    </SidebarHeaderButton>
  );
};
