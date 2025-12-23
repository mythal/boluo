import { type StatusKind } from '@boluo/api';
import { useAtomValue, useStore } from 'jotai';
import { useEffect } from 'react';
import { connectionStateAtom } from '../state/chat.atoms';
import { panesAtom } from '../state/view.atoms';
import { type ChannelPane } from '../state/view.types';

const SEND_STATUS_INTERVAL = 2000;

function sendStatus(connection: WebSocket, status: StatusKind, focus: string[]) {
  if (connection.readyState !== WebSocket.OPEN) {
    return;
  }
  connection.send(
    JSON.stringify({
      type: 'STATUS',
      kind: status,
      focus,
    }),
  );
}

export function useSendStatus() {
  const store = useStore();
  const connectionState = useAtomValue(connectionStateAtom);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (connectionState.type !== 'CONNECTED') {
      return;
    }
    const connection = connectionState.connection;
    // TODO: Activity tracking based on user input (#200)
    const pulse = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      const panes = store.get(panesAtom);
      const channelPanes: ChannelPane[] = panes.filter(
        (pane) => pane.type === 'CHANNEL',
      ) as ChannelPane[];
      sendStatus(
        connection,
        'ONLINE',
        channelPanes.map((pane) => pane.channelId),
      );
    }, SEND_STATUS_INTERVAL);
    const visibilityListener = () => {
      const panes = store.get(panesAtom);
      const channelPanes: ChannelPane[] = panes.filter(
        (pane) => pane.type === 'CHANNEL',
      ) as ChannelPane[];
      const state = document.visibilityState;
      const focus = channelPanes.map((pane) => pane.channelId);
      if (state === 'visible') {
        sendStatus(connection, 'ONLINE', focus);
      } else if (state === 'hidden') {
        sendStatus(connection, 'AWAY', focus);
      }
    };
    document.addEventListener('visibilitychange', visibilityListener);
    return () => {
      window.clearInterval(pulse);
      document.removeEventListener('visibilitychange', visibilityListener);
    };
  }, [connectionState, store]);
}
