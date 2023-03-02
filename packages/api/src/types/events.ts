import type { ClientEvent } from 'server-bindings/ClientEvent';
import type { Event as ServerEvent } from 'server-bindings/Event';
import type { EventBody } from 'server-bindings/EventBody';

export function isServerEvent(object: unknown): object is ServerEvent {
  if (typeof object !== 'object' || object === null) {
    return false;
  }
  return 'mailbox' in object && 'body' in object;
}

export { ClientEvent, EventBody, ServerEvent };
