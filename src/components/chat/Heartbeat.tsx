import * as React from 'react';
import { useEffect } from 'react';
import { useSend } from '../../hooks/useSend';
import { HEARTBEAT_INTERVAL } from '../../settings';
import { SendStatus } from 'api/events';
import { useAtom } from 'jotai';
import { focusChannelAtom } from '../../states/focusChannel';

export function useHeartbeat() {
  const send = useSend();
  const [focusChannelSet] = useAtom(focusChannelAtom);
  const focus = focusChannelSet.toArray();
  const onlineStatus: SendStatus = { type: 'STATUS', kind: 'ONLINE', focus };
  const leaveStates: SendStatus = { type: 'STATUS', kind: 'AWAY', focus };
  useEffect(() => {
    const pulse = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        send(onlineStatus);
      }
    }, HEARTBEAT_INTERVAL);
    const visibilityListener = () => {
      const state = document.visibilityState;
      if (state === 'visible') {
        send(onlineStatus);
      } else if (state === 'hidden') {
        send(leaveStates);
      }
    };
    document.addEventListener('visibilitychange', visibilityListener);
    return () => window.clearInterval(pulse);
  }, [send, focus]);
  return null;
}
