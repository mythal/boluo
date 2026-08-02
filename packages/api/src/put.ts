import type {
  Character,
  EditCharacter,
  EditEntry,
  EditNote,
  Entry,
  Note,
} from '@boluo/types/bindings';

export interface Put {
  '/characters/edit': { payload: EditCharacter; query: null; result: Character };
  '/notes/edit': { payload: EditNote; query: null; result: Note };
  '/entries/edit': { payload: EditEntry; query: null; result: Entry };
}
