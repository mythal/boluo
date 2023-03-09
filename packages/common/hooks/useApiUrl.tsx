import { atom, useAtomValue } from 'jotai';

const isBrowser = typeof window !== 'undefined';

export const DEFAULT_API_URL = isBrowser ? window.location.origin + '/api' : 'https://staging.boluo.chat/api';

export const apiUrlAtom = atom(DEFAULT_API_URL);

export const useApiUrl = () => {
  return useAtomValue(apiUrlAtom);
};
