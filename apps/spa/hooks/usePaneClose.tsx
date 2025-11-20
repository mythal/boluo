import { useSetAtom } from 'jotai';
import { useCallback, useContext } from 'react';
import { panesAtom } from '../state/view.atoms';
import { PaneContext } from '../state/view.context';
import { useIsChildPane } from './useIsChildPane';

export const usePaneClose = () => {
  const { key } = useContext(PaneContext);
  const setPanes = useSetAtom(panesAtom);
  const isChild = useIsChildPane();
  return useCallback(
    () =>
      setPanes((panes) => {
        const index = panes.findIndex((pane) => pane.key === key);
        if (index === -1) {
          return panes;
        }
        const pane = panes[index]!;
        const nextPanes = [...panes];
        if (isChild) {
          nextPanes[index] = { ...pane, child: undefined };
        } else if (pane.child) {
          nextPanes[index] = { ...pane.child.pane, key: pane.key };
        } else {
          nextPanes.splice(index, 1);
        }
        return nextPanes;
      }),
    [isChild, key, setPanes],
  );
};
