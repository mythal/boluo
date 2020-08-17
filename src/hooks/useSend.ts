import { ClientEvent } from '../api/events';
import { useSelector } from '../store';
import { useCallback } from 'react';

export const useSend = (): ((event: ClientEvent) => void) => {
  const connection = useSelector((state) => state.chat?.connection);
  if (!connection) {
    throw new Error('Calling the send interface without loading the chat.');
  }
  return useCallback(
    (event: ClientEvent) => {
      // TODO: queued events.
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify(event));
      }
    },
    [connection]
  );
};
