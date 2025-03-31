import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { isCrossOrigin } from '../settings';

export type ConnectState = 'CONNECTING' | 'OPEN' | 'CLOSED';
export const connectionStateAtom = atom<ConnectState>('CLOSED');

export const autoSelectAtom = atomWithStorage<boolean>('BOLUO_AUTO_SELECT_PROXY', !isCrossOrigin);
