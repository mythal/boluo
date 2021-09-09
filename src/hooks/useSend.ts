import { ClientEvent } from '../api/events';
import { useSelector } from '../store';
import { useCallback } from 'react';
import { useChannelId } from './useChannelId';

export const useSend = (): ((event: ClientEvent) => void) => {
  const connection = useSelector((state) => state.ui.connection);
  return useCallback(
    (event: ClientEvent) => {
      // TODO: queued events.
      if (!connection) {
        return;
      }
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify(event));
      }
    },
    [connection]
  );
};
