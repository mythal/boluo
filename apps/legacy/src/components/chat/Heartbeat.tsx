import { useEffect } from 'react';
import { type SendStatus } from '../../api/events';
import { normalizeStatusFocus, STATUS_REFRESH_INTERVAL_MS } from '@boluo/api/status';
import { useSend } from '../../hooks/useSend';
import { useSelector } from '../../store';

export function useHeartbeat() {
  const send = useSend();
  const focus = useSelector((state) => state.ui.focusChannelList);
  useEffect(() => {
    const sendCurrentStatus = () => {
      const status: SendStatus = {
        type: 'STATUS',
        kind: document.visibilityState === 'visible' ? 'ONLINE' : 'AWAY',
        focus: normalizeStatusFocus(focus),
      };
      send(status);
    };
    sendCurrentStatus();
    const pulse = window.setInterval(() => {
      if (document.visibilityState === 'visible') sendCurrentStatus();
    }, STATUS_REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', sendCurrentStatus);
    return () => {
      window.clearInterval(pulse);
      document.removeEventListener('visibilitychange', sendCurrentStatus);
    };
  }, [focus, send]);
  return null;
}
