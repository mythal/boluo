import { atomWithStore } from 'jotai/redux';
import store from '../store';

export const storeAtom = atomWithStore(store);
