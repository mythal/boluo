import type { EditMessage, Message } from '@boluo/types/bindings';

export interface Patch {
  '/users/update_settings': { payload: object; query: null; result: object };
  '/messages/edit': { payload: EditMessage; query: null; result: Message };
}
