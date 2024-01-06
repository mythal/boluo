import { useSetAtom } from 'jotai';
import { useCallback, useContext } from 'react';
import { panesAtom } from '../state/view.atoms';
import { PaneContext } from '../state/view.context';

export const usePaneClose = () => {
  const { key } = useContext(PaneContext);
  const setPanes = useSetAtom(panesAtom);
  return useCallback(() => setPanes((panes) => panes.filter((pane) => pane.key !== key)), [key, setPanes]);
};
