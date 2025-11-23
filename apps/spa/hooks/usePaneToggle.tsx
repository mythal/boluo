import { useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { findNextPaneKey, panesAtom } from '../state/view.atoms';
import {
  insertPaneByPosition,
  type ChildPaneRatio,
  type NewPanePosition,
  type Pane,
  type PaneData,
} from '../state/view.types';
import { usePaneLimit } from './useMaxPane';
import { usePaneKey } from './usePaneKey';
import { useIsChildPane } from './useIsChildPane';

interface Props {
  child?: false | ChildPaneRatio;
}

const isSamePane = (pane: PaneData, target: PaneData) => {
  if (pane.type !== target.type) {
    return false;
  }
  if (pane.type === 'CHANNEL' && target.type === 'CHANNEL') {
    return pane.channelId === target.channelId;
  }
  if (pane.type === 'PROFILE' && target.type === 'PROFILE') {
    return pane.userId === target.userId;
  }
  if (pane.type === 'SPACE_MEMBERS' && target.type === 'SPACE_MEMBERS') {
    return pane.spaceId === target.spaceId;
  }
  if (pane.type === 'SPACE_SETTINGS' && target.type === 'SPACE_SETTINGS') {
    return pane.spaceId === target.spaceId;
  }
  return true;
};

const findPane = (panes: Pane[], pane: PaneData) => {
  for (let i = 0; i < panes.length; i++) {
    const current = panes[i]!;
    if (isSamePane(current, pane)) {
      return { index: i, isChild: false };
    }
    if (current.child && isSamePane(current.child.pane, pane)) {
      return { index: i, isChild: true };
    }
  }
  return null;
};

export const usePaneToggle = (props?: Props) => {
  const { child = false } = props || {};
  const setPanes = useSetAtom(panesAtom);
  const paneLimit = usePaneLimit();
  const paneKey = usePaneKey();
  const isChildPane = useIsChildPane();
  return useCallback(
    (pane: PaneData, position: NewPanePosition = 'HEAD') =>
      setPanes((panes) => {
        if (child) {
          const index = panes.findIndex((x) => x.key === paneKey);
          if (index === -1) return panes;
          const currentPane = panes[index]!;
          const nextPanes = [...panes];
          if (isChildPane && currentPane.child) {
            const promotedPaneKey = findNextPaneKey(panes);
            const promotedPane: Pane = { ...currentPane.child.pane, key: promotedPaneKey };
            nextPanes[index] = { ...currentPane, child: undefined };
            nextPanes.splice(index + 1, 0, {
              ...promotedPane,
              child: { pane, ratio: child },
            });
            return nextPanes;
          }
          if (currentPane.child && currentPane.child.pane.type === pane.type) {
            nextPanes[index] = { ...currentPane, child: undefined };
          } else {
            nextPanes[index] = { ...currentPane, child: { pane, ratio: child } };
          }
          return nextPanes;
        }
        if (pane.type === 'EMPTY') return panes;
        if (paneLimit === 1) {
          return [{ ...pane, key: 0 }];
        }
        const existingPane = findPane(panes, pane);
        const nextKey = findNextPaneKey(panes);
        const newPane: Pane = { ...pane, key: nextKey };
        if (existingPane) {
          const nextPanes = [...panes];
          if (existingPane.isChild) {
            nextPanes[existingPane.index] = { ...nextPanes[existingPane.index]!, child: undefined };
          } else {
            nextPanes.splice(existingPane.index, 1);
          }
          return nextPanes;
        }

        return insertPaneByPosition(panes, newPane, position);
      }),
    [child, isChildPane, paneKey, paneLimit, setPanes],
  );
};
