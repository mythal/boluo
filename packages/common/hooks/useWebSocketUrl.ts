import { apiUrlAtom } from 'api-browser';
import { atom, useAtomValue } from 'jotai';

export const webSocketUrlAtom = atom(
  (get) => {
    const baseUrl = get(apiUrlAtom);
    return baseUrl.replace(/^http/, 'ws');
  },
);

export const useWebSocketUrl = () => {
  return useAtomValue(webSocketUrlAtom);
};
