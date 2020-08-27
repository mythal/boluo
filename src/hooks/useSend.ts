import { ClientEvent } from '../api/events';
import { useSelector } from '../store';
import { useCallback } from 'react';
import { usePane } from './usePane';

export const useSend = (): ((event: ClientEvent) => void) => {
  const pane = usePane();
  const connection = useSelector((state) => state.chatPane[pane]?.connection);
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
