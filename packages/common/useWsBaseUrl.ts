import { atom, useAtomValue } from 'jotai';
import { baseUrlAtom } from './useBaseUrl';

export const wsBaseUrlAtom = atom(
  (get) => {
    const baseUrl = get(baseUrlAtom);
    return baseUrl.replace(/^http/, 'ws');
  },
);

export const useWsBaseUrl = () => {
  return useAtomValue(wsBaseUrlAtom);
};
