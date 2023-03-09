import { atom, useAtomValue } from 'jotai';
import { DEFAULT_API_URL } from '../const';

export const apiUrlAtom = atom(DEFAULT_API_URL);

export const useApiUrl = () => {
  return useAtomValue(apiUrlAtom);
};
