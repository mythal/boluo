import { atom } from 'jotai';
import { newId } from '../../../utils/id';
import { Entity } from '../../../interpreter/entities';
export const defaultDiceAtom = atom('d');

export interface UserItem {
  label: string;
  value: string;
}
const ACTION_COMMAND = /^[.。]me\s*/;
export const isActionAtom = atom<boolean, boolean | 'toggle'>(
  (get) => {
    const sauce = get(sourceAtom);
    return Boolean(sauce.match(ACTION_COMMAND));
  },
  (get, set, update) => {
    const prev = get(isActionAtom);
    if (prev === update) {
      return;
    }
    if (update === 'toggle') {
      update = !prev;
    }
    const source = get(sourceAtom);
    if (update) {
      set(sourceAtom, '.me ' + source);
    } else {
      const match = source.match(ACTION_COMMAND);
      if (match) {
        set(sourceAtom, source.substr(match[0].length));
      }
    }
  }
);

export const broadcastAtom = atom(true);

export const inGameAtom = atom(false);

export const whisperToAtom = atom<UserItem[] | null | undefined>(null);

export const sourceAtom = atom<string>('');

// export const parsedAtom = atom<{ text: string, entities: Entity[] }>((read) => {
//
// });

export const mediaAtom = atom<File | undefined>(undefined);

export const messageIdAtom = atom(newId());

export const editForAtom = atom<number | null>(null);

export const sendingAtom = atom(false);

export const entitiesAtom = atom<Entity[]>([]);

export const inputNameAtom = atom('');

export const initializedAtom = atom(false);
