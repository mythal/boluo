import { type SendStatus } from 'api/events';
import { useEffect, useRef } from 'react';
import { useSend } from '../../hooks/useSend';
import { HEARTBEAT_INTERVAL } from '../../settings';
import { useSelector } from '../../store';

export function useHeartbeat() {
  const send = useSend();
  const focus = useSelector((state) => state.ui.focusChannelList);
  const focusRef = useRef(focus);
  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);
  useEffect(() => {
    const pulse = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        const onlineStatus: SendStatus = {
          type: 'STATUS',
          kind: 'ONLINE',
          focus: focusRef.current,
        };
        send(onlineStatus);
      }
    }, HEARTBEAT_INTERVAL);
    const visibilityListener = () => {
      const state = document.visibilityState;
      if (state === 'visible') {
        const onlineStatus: SendStatus = {
          type: 'STATUS',
          kind: 'ONLINE',
          focus: focusRef.current,
        };
        send(onlineStatus);
      } else if (state === 'hidden') {
        const awayStatus: SendStatus = { type: 'STATUS', kind: 'AWAY', focus: focusRef.current };
        send(awayStatus);
      }
    };
    document.addEventListener('visibilitychange', visibilityListener);
    return () => {
      window.clearInterval(pulse);
      document.removeEventListener('visibilitychange', visibilityListener);
    };
  }, [send]);
  return null;
}
