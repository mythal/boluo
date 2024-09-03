import { type FC, Suspense } from 'react';
import { type ConnectionState } from '../../state/connection.reducer';
import { FloatingBox } from '@boluo/ui/FloatingBox';
import { ConnectionIndicatorConnected } from './ConnectionIndicatorConnected';
import { ConnectionIndicatorConnecting } from './ConnectionIndicatorConnecting';
import { ConnectionIndicatorClosed } from './ConnectionIndicatorClosed';
import { BaseUrlSelector } from './BaseUrlSelector';

interface Props {
  connectionState: ConnectionState;
}

export const BaseUrlSelectionPanel: FC<Props> = ({ connectionState }) => {
  return (
    <FloatingBox>
      <div className="flex flex-col gap-4">
        {connectionState.type === 'CONNECTED' && <ConnectionIndicatorConnected />}
        {connectionState.type === 'CONNECTING' && <ConnectionIndicatorConnecting />}
        {connectionState.type === 'CLOSED' && <ConnectionIndicatorClosed countdown={connectionState.countdown} />}
        <Suspense fallback="...">
          <BaseUrlSelector />
        </Suspense>
      </div>
    </FloatingBox>
  );
};
