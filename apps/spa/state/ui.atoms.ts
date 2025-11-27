import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const isSidebarExpandedAtom = atomWithStorage('boluo-sidebar-expanded', true);

export const sidebarContentStateAtom = atom<'CHANNELS' | 'SPACES' | 'CONNECTIONS'>('CHANNELS');
