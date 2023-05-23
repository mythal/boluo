import { Proxy } from 'api';
import { atom } from 'jotai';

export const proxiesAtom = atom(async (get): Promise<Proxy[]> => {
  const response = await fetch('/api/info/proxies');
  return (await response.json()) as Proxy[];
});
