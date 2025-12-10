import { atom } from 'jotai';
import { type Id } from '../utils/id';

export const userDialogAtom = atom<Id | null>(null);
