import { atom, useAtomValue } from 'jotai';

export const baseUrlAtom = atom('http://localhost:3000/api');

export const useBaseUrl = () => {
  return useAtomValue(baseUrlAtom);
};
