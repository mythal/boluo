import { atom } from 'jotai';
import { Id } from '../utils/id';

export const userDialogAtom = atom<Id | null>(null);
