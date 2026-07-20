import { useCallback } from 'react';
import { type ClientEvent } from '../api/events';
import { useSelector } from '../store';

export const useSend = (): ((event: ClientEvent) => boolean) => {
  const connection = useSelector((state) => state.ui.connection);
  return useCallback(
    (event: ClientEvent) => {
      // TODO: queued events.
      if (!connection) {
        return false;
      }
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify(event));
        return true;
      }
      return false;
    },
    [connection],
  );
};
