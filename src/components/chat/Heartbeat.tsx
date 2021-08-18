import * as React from 'react';
import { useEffect } from 'react';
import store, { useSelector } from '../../store';
import { usePane } from '../../hooks/usePane';
import { useSend } from '../../hooks/useSend';
import { HEARTBEAT_INTERVAL } from '../../settings';
import { StatusKind } from 'api/spaces';
import { SendStatus } from 'api/events';

export function useHeartbeat() {
  const send = useSend();
  const focus = [usePane()];
  const onlineStatus: SendStatus = { type: 'STATUS', kind: 'ONLINE', focus };
  const leaveStates: SendStatus = { type: 'STATUS', kind: 'LEAVE', focus };
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
