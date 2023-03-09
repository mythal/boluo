import { atom, useAtomValue } from 'jotai';
import { apiUrlAtom } from './useApiUrl';

export const webSocketUrlAtom = atom(
  (get) => {
    const baseUrl = get(apiUrlAtom);
    return baseUrl.replace(/^http/, 'ws');
  },
);

export const useWebSocketUrl = () => {
  return useAtomValue(webSocketUrlAtom);
};
