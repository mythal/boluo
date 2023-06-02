import { atom, useAtomValue } from 'jotai';
import { createContext, FC, ReactNode, useMemo } from 'react';
import { focusPaneAtom } from './view.atoms';

interface PaneContext {
  key: number | null;
  focused: boolean;
}

export const PaneContext = createContext<PaneContext>({ key: null, focused: false });

interface Props {
  children: ReactNode;
  paneKey: number;
}

export const PaneProvider: FC<Props> = ({ paneKey: key, children }) => {
  const isFocusedAtom = useMemo(() => atom((get) => get(focusPaneAtom) === key), [key]);
  const focused = useAtomValue(isFocusedAtom);
  const value: PaneContext = useMemo(() => ({ key, focused }), [focused, key]);
  return <PaneContext.Provider value={value}>{children}</PaneContext.Provider>;
};
