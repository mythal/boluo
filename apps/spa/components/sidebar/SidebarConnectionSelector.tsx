import { useAtomValue, useSetAtom } from 'jotai';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { connectionStateAtom } from '../../state/chat.atoms';
import { sidebarContentStateAtom } from '../../state/ui.atoms';
import { ConnectionIndicatorConnected } from './ConnectionIndicatorConnected';
import { ConnectionIndicatorConnecting } from './ConnectionIndicatorConnecting';
import { ConnectionIndicatorClosed } from './ConnectionIndicatorClosed';
import { BaseUrlSelector } from './BaseUrlSelector';

export const SidebarConnectionSelector: FC = () => {
  const connectionState = useAtomValue(connectionStateAtom);
  const setSidebarContentState = useSetAtom(sidebarContentStateAtom);

  const handleClose = () => setSidebarContentState('CHANNELS');

  return (
    <div className="SidebarConnectionSelector flex h-full flex-col">
      <div className="h-pane-header flex items-center justify-between px-4 py-2 text-sm">
        <span className="font-bold">
          <FormattedMessage defaultMessage="Switch Connection" />
        </span>
        <ButtonInline onClick={handleClose}>
          <FormattedMessage defaultMessage="Done" />
        </ButtonInline>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-2">
          <div className="text-text-secondary flex gap-2 px-1 text-sm">
            {connectionState.type === 'CONNECTED' && <ConnectionIndicatorConnected />}
            {connectionState.type === 'CONNECTING' && <ConnectionIndicatorConnecting />}
            {connectionState.type === 'CLOSED' && (
              <ConnectionIndicatorClosed countdown={connectionState.countdown} />
            )}
          </div>
          <BaseUrlSelector />
        </div>
      </div>
    </div>
  );
};
