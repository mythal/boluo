import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { findNextPaneKey, focusPaneAtom, panesAtom } from '../state/view.atoms';
import { type Pane, type PaneData } from '../state/view.types';
import { usePaneLimit } from './useMaxPane';

export const usePaneReplace = () => {
  const focus = useAtomValue(focusPaneAtom);
  const key = focus?.key ?? null;
  const setPanes = useSetAtom(panesAtom);
  const maxPane = usePaneLimit();
  return useCallback(
    (newPane: PaneData, shouldReplace?: (pane: Pane) => boolean) =>
      setPanes((panes) => {
        // If the focused pane is a child, prefer replacing the child in place.
        if (focus?.isChild && key != null) {
          const hostIndex = panes.findIndex((pane) => pane.key === key);
          const hostPane = hostIndex === -1 ? undefined : panes[hostIndex];
          if (hostPane?.child) {
            const childAsPane: Pane = { ...hostPane.child.pane, key: hostPane.key };
            if (!shouldReplace || shouldReplace(childAsPane)) {
              const next = [...panes];
              next[hostIndex] = {
                ...hostPane,
                child: { ...hostPane.child, pane: newPane },
              };
              return next;
            }
          }
        }

        if (maxPane === 1) {
          const single = panes[0];
          return [{ ...newPane, key: single?.key ?? 0 }];
        }
        const newPaneKey = findNextPaneKey(panes);
        const nextPanes = [...panes];
        const pane: Pane = { ...newPane, key: newPaneKey };
        if (panes.length === 0) {
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
          // If the focused pane has a child, replacing the parent but keep the child.
          const newPaneWithChild = oldPane?.child ? { ...newPane, child: oldPane.child } : newPane;
          nextPanes[index] = { ...newPaneWithChild, key: oldPane?.key ?? newPaneKey };
        } else {
          nextPanes.unshift({ ...newPane, key: newPaneKey });
        }
        return nextPanes;
      }),
    [focus?.isChild, key, maxPane, setPanes],
  );
};
