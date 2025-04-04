import { atom, useAtomValue } from 'jotai';
import { createContext, type FC, type ReactNode, useMemo } from 'react';
import { focusPaneAtom } from './view.atoms';

interface PaneContext {
  key: number | null;
  focused: boolean;
  canClose?: boolean;
}

export const PaneContext = createContext<PaneContext>({
  key: null,
  focused: true,
  canClose: false,
});

interface Props {
  children: ReactNode;
  paneKey: number;
  canClose?: boolean;
}

export const PaneProvider: FC<Props> = ({ paneKey: key, children, canClose = true }) => {
  const isFocusedAtom = useMemo(() => atom((get) => get(focusPaneAtom) === key), [key]);
  const focused = useAtomValue(isFocusedAtom);
  const value: PaneContext = useMemo(() => ({ key, focused, canClose }), [canClose, focused, key]);
  return <PaneContext value={value}>{children}</PaneContext>;
};
