export type * from './bindings';
import type { Update } from './bindings';

export function isServerUpdate(object: unknown): object is Update {
  if (typeof object !== 'object' || object === null) {
    return false;
  }
  return 'mailbox' in object && 'body' in object;
}
