export type * from './types/events';
import type { ServerEvent } from './types/events';

export function isServerEvent(object: unknown): object is ServerEvent {
  if (typeof object !== 'object' || object === null) {
    return false;
  }
  return 'mailbox' in object && 'body' in object;
}
