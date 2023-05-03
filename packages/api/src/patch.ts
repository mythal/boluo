import type { EditMessage, Message } from './types/messages';

export interface Patch {
  '/users/update_settings': { payload: object; query: null; result: object };
  '/messages/edit': { payload: EditMessage; query: null; result: Message };
}
