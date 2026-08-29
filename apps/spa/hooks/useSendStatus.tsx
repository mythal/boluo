import { type StatusKind } from '@boluo/api';
import { normalizeStatusFocus, STATUS_REFRESH_INTERVAL_MS } from '@boluo/api/status';
import { useAtomValue, useStore } from 'jotai';
import { useEffect } from 'react';
import { connectionStateAtom } from '../state/chat.atoms';
import { panesAtom } from '../state/view.atoms';
import { type ChannelPane } from '../state/view.types';

const getFocusedChannels = (panes: ChannelPane[]): string[] =>
  normalizeStatusFocus(panes.map((pane) => pane.channelId));

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
    const sendCurrentStatus = () => {
      const panes = store.get(panesAtom);
      const channelPanes: ChannelPane[] = panes.filter((pane) => pane.type === 'CHANNEL');
      sendStatus(
        connection,
        document.visibilityState === 'visible' ? 'ONLINE' : 'AWAY',
        getFocusedChannels(channelPanes),
      );
    };
    sendCurrentStatus();
    const unsubscribePanes = store.sub(panesAtom, sendCurrentStatus);
    const pulse = window.setInterval(() => {
      if (document.visibilityState === 'visible') sendCurrentStatus();
    }, STATUS_REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', sendCurrentStatus);
    return () => {
      window.clearInterval(pulse);
      unsubscribePanes();
      document.removeEventListener('visibilitychange', sendCurrentStatus);
    };
  }, [connectionState, store]);
}
