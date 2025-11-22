import { atom, useAtomValue } from 'jotai';
import { createContext, type FC, type ReactNode, useMemo } from 'react';
import { focusPaneAtom } from './view.atoms';

interface PaneContext {
  key: number | null;
  focused: boolean;
  canClose?: boolean;
  isChild: boolean;
}

export const PaneContext = createContext<PaneContext>({
  key: null,
  focused: true,
  canClose: false,
  isChild: false,
});

interface Props {
  children: ReactNode;
  paneKey: number;
  canClose?: boolean;
  isChild?: boolean;
}

export const PaneProvider: FC<Props> = ({
  paneKey: key,
  children,
  canClose = true,
  isChild = false,
}) => {
  const isFocusedAtom = useMemo(
    () =>
      atom((get) => {
        const focusPane = get(focusPaneAtom);
        if (focusPane == null) {
          return false;
        }
        return focusPane.key === key && focusPane.isChild === isChild;
      }),
    [isChild, key],
  );
  const focused = useAtomValue(isFocusedAtom);
  const value: PaneContext = useMemo(
    () => ({ key, focused, canClose, isChild }),
    [canClose, focused, isChild, key],
  );
  return <PaneContext value={value}>{children}</PaneContext>;
};
