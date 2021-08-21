import { atom } from 'jotai';
import { Set } from 'immutable';
import { Id } from '../utils/id';

export const focusChannelAtom = atom<Set<Id>>(Set<Id>());
