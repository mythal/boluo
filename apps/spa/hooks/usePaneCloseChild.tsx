import { useSetAtom } from 'jotai';
import { useCallback, useContext } from 'react';
import { panesAtom } from '../state/view.atoms';
import { PaneContext } from '../state/view.context';

export const usePaneClearChild = () => {
  const { key } = useContext(PaneContext);
  const setPanes = useSetAtom(panesAtom);
  return useCallback(
    () => setPanes((panes) => panes.map((pane) => (pane.key === key ? { ...pane, child: undefined } : pane))),
    [key, setPanes],
  );
};
