import { atomWithStorage } from 'jotai/utils';

export const devMode = atomWithStorage('dev-mode', false);
