import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { findNextPaneKey, focusPaneAtom, panesAtom } from '../state/view.atoms';
import { type Pane, type PaneData } from '../state/view.types';
import { usePaneLimit } from './useMaxPane';

export const usePaneReplace = () => {
  const key = useAtomValue(focusPaneAtom);
  const setPanes = useSetAtom(panesAtom);
  const maxPane = usePaneLimit();
  return useCallback(
    (newPane: PaneData, shouldReplace?: (pane: Pane) => boolean) =>
      setPanes((panes) => {
        if (maxPane === 1) {
          return [{ ...newPane, key: panes[0]?.key ?? 0 }];
        }
        const newPaneKey = findNextPaneKey(panes);
        const nextPanes = [...panes];
        const pane: Pane = { ...newPane, key: newPaneKey };
        if (panes.length === 0) {
          return [pane];
        } else if (panes.length === 1) {
          if (shouldReplace && !shouldReplace(panes[0]!)) {
            nextPanes.unshift(pane);
            return nextPanes;
          }
          return [pane];
        }
        let replace = true;
        if (key == null) {
          replace = false;
        }
        const index = panes.findIndex((pane) => pane.key === key);
        if (index === -1) {
          replace = false;
        }
        const oldPane = panes[index];
        if (shouldReplace && oldPane && !shouldReplace(oldPane)) {
          replace = false;
        }
        if (replace) {
          nextPanes[index] = { ...newPane, key: oldPane?.key ?? newPaneKey };
        } else {
          nextPanes.unshift({ ...newPane, key: newPaneKey });
        }
        return nextPanes;
      }),
    [key, maxPane, setPanes],
  );
};
