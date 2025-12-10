import { type SendStatus } from 'api/events';
import { useEffect, useRef } from 'react';
import { useSend } from '../../hooks/useSend';
import { HEARTBEAT_INTERVAL } from '../../settings';
import { useSelector } from '../../store';

export function useHeartbeat() {
  const send = useSend();
  const focus = useSelector((state) => state.ui.focusChannelList);
  const onlineStatus = useRef<SendStatus>({ type: 'STATUS', kind: 'ONLINE', focus });
  const leaveStates = useRef<SendStatus>({ type: 'STATUS', kind: 'AWAY', focus });
  useEffect(() => {
    const pulse = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        send(onlineStatus.current);
      }
    }, HEARTBEAT_INTERVAL);
    const visibilityListener = () => {
      const state = document.visibilityState;
      if (state === 'visible') {
        send(onlineStatus.current);
      } else if (state === 'hidden') {
        send(leaveStates.current);
      }
    };
    document.addEventListener('visibilitychange', visibilityListener);
    return () => {
      window.clearInterval(pulse);
      document.removeEventListener('visibilitychange', visibilityListener);
    };
  }, [send, focus]);
  return null;
}
