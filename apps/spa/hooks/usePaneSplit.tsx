import { useSetAtom } from 'jotai';
import { useCallback, useContext } from 'react';
import { findNextPaneKey, panesAtom } from '../state/view.atoms';
import { PaneContext } from '../state/view.context';

export const usePaneSplit = () => {
  const { key } = useContext(PaneContext);
  const setPanes = useSetAtom(panesAtom);
  return useCallback(
    () =>
      setPanes((panes) => {
        if (key === null) return panes;
        const index = panes.findIndex((pane) => pane.key === key);
        if (index === -1) return panes;
        const pane = panes[index]!;
        const newPaneKey = findNextPaneKey(panes);
        const nextPanes = [...panes];
        nextPanes.splice(index, 0, { ...pane, key: newPaneKey });
        return nextPanes;
      }),
    [key, setPanes],
  );
};
