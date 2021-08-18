import { ClientEvent } from '../api/events';
import { useSelector } from '../store';
import { useCallback } from 'react';
import { usePane } from './usePane';

export const useSend = (): ((event: ClientEvent) => void) => {
  const pane = usePane();
  const connection = useSelector((state) => state.ui.connection);
  return useCallback(
    (event: ClientEvent) => {
      // TODO: queued events.
      if (!connection) {
        console.log('Calling the send interface without loading the chat.');
        return;
      }
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify(event));
      }
    },
    [connection]
  );
};
