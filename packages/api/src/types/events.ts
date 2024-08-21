import type { ClientEvent } from '@boluo/server-bindings/ClientEvent';
import type { Event as ServerEvent } from '@boluo/server-bindings/Event';
import type { EventBody } from '@boluo/server-bindings/EventBody';
import type { EventId } from '@boluo/server-bindings/EventId';
import type { ConnectionError } from '@boluo/server-bindings/ConnectionError';

export function isServerEvent(object: unknown): object is ServerEvent {
  if (typeof object !== 'object' || object === null) {
    return false;
  }
  return 'mailbox' in object && 'body' in object;
}

export { ClientEvent, EventBody, EventId, ServerEvent, ConnectionError };
