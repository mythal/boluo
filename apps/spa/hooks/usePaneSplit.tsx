import { useSetAtom } from 'jotai';
import { useCallback, useContext } from 'react';
import { findNextPaneKey, panesAtom } from '../state/view.atoms';
import { PaneContext } from '../state/view.context';
import { usePaneLimit } from './useMaxPane';

export const usePaneSplit = () => {
  const { key } = useContext(PaneContext);

  const paneLimit = usePaneLimit();
  const setPanes = useSetAtom(panesAtom);
  return useCallback(
    () =>
      setPanes((panes) => {
        if (key == null || paneLimit < 2) return panes;
        const index = panes.findIndex((pane) => pane.key === key);
        if (index === -1) return panes;
        const pane = panes[index]!;
        const newPaneKey = findNextPaneKey(panes);
        const nextPanes = [...panes];
        nextPanes.splice(index, 0, { ...pane, child: undefined, key: newPaneKey });
        return nextPanes;
      }),
    [key, paneLimit, setPanes],
  );
};
