import { apiUrlAtom } from '@boluo/api-browser';
import { type Atom, atom, useAtomValue } from 'jotai';

export const webSocketUrlAtom: Atom<string> = atom((get) => {
  const baseUrl = get(apiUrlAtom);
  return baseUrl.replace(/^http/, 'ws');
});

export const useWebSocketUrl = () => {
  return useAtomValue(webSocketUrlAtom);
};
