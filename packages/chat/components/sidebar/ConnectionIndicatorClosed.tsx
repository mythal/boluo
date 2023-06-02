import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useChatDispatch } from '../../state/chat.atoms';

interface Props {
  countdown: number;
}

export const ConnectionIndicatorClosed: FC<Props> = ({ countdown }) => {
  const dispatch = useChatDispatch();
  const immediatelyReconnect = () => {
    dispatch('reconnectCountdownTick', { immediately: true });
  };
  return (
    <div className="flex flex-col gap-2">
      <div>
        <FormattedMessage defaultMessage="Waiting for reconnection ({countdown}s)" values={{ countdown }} />
      </div>
      <div>
        <button className="underline" onClick={immediatelyReconnect}>Reconnect Now</button>
      </div>
      <div>
        <button className="underline" onClick={() => window.location.reload()}>Refresh Page</button>
      </div>
    </div>
  );
};
