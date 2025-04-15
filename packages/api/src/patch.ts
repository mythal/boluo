import type { EditMessage, Message } from './bindings';

export interface Patch {
  '/users/update_settings': { payload: object; query: null; result: object };
  '/messages/edit': { payload: EditMessage; query: null; result: Message };
}
