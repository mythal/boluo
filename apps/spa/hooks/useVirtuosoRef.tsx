import { useContext } from 'react';
import { createContext, type RefObject } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';

export const VirtuosoRefContext = createContext<RefObject<VirtuosoHandle | null>>({
  current: null,
});

export const useVirtuosoRef = (): RefObject<VirtuosoHandle | null> =>
  useContext(VirtuosoRefContext);
