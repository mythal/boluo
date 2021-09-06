import { atom } from 'jotai';
import { UserItem } from './reducer';
import { newId } from '../../../utils/id';
import { Entity } from '../../../interpreter/entities';

export const isActionAtom = atom(false);

export const broadcastAtom = atom(true);

export const inGameAtom = atom(false);

export const whisperToAtom = atom<UserItem[] | null | undefined>(null);

export const textAtom = atom('');

export const mediaAtom = atom<File | undefined>(undefined);

export const messageIdAtom = atom(newId());

export const editForAtom = atom<number | undefined>(undefined);

export const sendingAtom = atom(false);

export const entitiesAtom = atom<Entity[]>([]);

export const inputNameAtom = atom('');
