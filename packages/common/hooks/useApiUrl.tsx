import { atom, useAtomValue } from 'jotai';

const isBrowser = typeof window !== 'undefined';

export const DEFAULT_API_URL = isBrowser ? window.location.origin : process.env.BACKEND_URL || '';

export const apiUrlAtom = atom(DEFAULT_API_URL + '/api');

export const useApiUrl = () => {
  return useAtomValue(apiUrlAtom);
};
