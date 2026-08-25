import type { ClientWebSocketCloseReason } from '@boluo/types/bindings';

export const NORMAL_WEBSOCKET_CLOSE_CODE = 1000;

export type { ClientWebSocketCloseReason } from '@boluo/types/bindings';

export const closeWebSocketNormally = (
  connection: WebSocket,
  reason: Exclude<ClientWebSocketCloseReason, 'UNKNOWN'>,
): void => {
  if (connection.readyState === WebSocket.CLOSING || connection.readyState === WebSocket.CLOSED) {
    return;
  }
  connection.close(NORMAL_WEBSOCKET_CLOSE_CODE, reason);
};
