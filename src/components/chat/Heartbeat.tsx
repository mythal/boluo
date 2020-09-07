import * as React from 'react';
import { useEffect } from 'react';
import { useSelector } from '../../store';
import { usePane } from '../../hooks/usePane';
import { useSend } from '../../hooks/useSend';
import { HEARTBEAT_INTERVAL } from '../../settings';

function Heartbeat() {
  const pane = usePane();
  const shouldSend = useSelector((state) => {
    const chatState = state.chatPane[pane];
    if (chatState === undefined || state.profile === undefined) {
      return false;
    }
    const member = state.profile.channels.get(chatState.channel.id);
    return member !== undefined;
  });
  const send = useSend();

  useEffect(() => {
    if (!shouldSend) {
      return;
    }
    const pulse = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        send({ type: 'HEARTBEAT' });
      }
    }, HEARTBEAT_INTERVAL);
    return () => window.clearInterval(pulse);
  }, [send, shouldSend]);
  return null;
}

export default React.memo(Heartbeat);
