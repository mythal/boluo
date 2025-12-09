export type * from '@boluo/types/bindings';
import type { Update } from '@boluo/types/bindings';

export function isServerUpdate(object: unknown): object is Update {
  if (typeof object !== 'object' || object == null) {
    return false;
  }
  return 'mailbox' in object && 'body' in object;
}
