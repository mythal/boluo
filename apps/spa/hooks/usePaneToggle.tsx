import { useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { findNextPaneKey, panesAtom } from '../state/view.atoms';
import { insertPaneByPosition, NewPanePosition, Pane, PaneData } from '../state/view.types';
import { usePaneLimit } from './useMaxPane';
import { usePaneKey } from './usePaneKey';

interface Props {
  child?: boolean;
}

export const usePaneToggle = (props?: Props) => {
  const { child = false } = props || {};
  const setPanes = useSetAtom(panesAtom);
  const paneLimit = usePaneLimit();
  const paneKey = usePaneKey();
  return useCallback(
    (pane: PaneData, position: NewPanePosition = 'HEAD') =>
      setPanes((panes) => {
        if (child) {
          const index = panes.findIndex((x) => x.key === paneKey);
          if (index === -1) return panes;
          const currentPane = panes[index]!;
          const nextPanes = [...panes];
          if (currentPane.child && currentPane.child.type === pane.type) {
            nextPanes[index] = { ...currentPane, child: undefined };
          } else {
            nextPanes[index] = { ...currentPane, child: pane };
          }
          return nextPanes;
        }
        if (pane.type === 'EMPTY') return panes;
        if (paneLimit === 1) {
          return [{ ...pane, key: 0 }];
        }
        let index: number = -1;
        if (pane.type === 'CHANNEL') {
          index = panes.findIndex((x) => x.type === 'CHANNEL' && x.channelId === pane.channelId);
        } else if (pane.type === 'SPACE_MEMBERS' || pane.type === 'SPACE_SETTINGS') {
          index = panes.findIndex((x) => x.type === pane.type && x.spaceId === pane.spaceId);
        } else {
          index = panes.findIndex((x) => x.type === pane.type);
        }
        const nextKey = findNextPaneKey(panes);
        const newPane: Pane = { ...pane, key: nextKey };
        if (index !== -1) {
          const nextPanes = [...panes];
          nextPanes.splice(index, 1);
          return nextPanes;
        }

        return insertPaneByPosition(panes, newPane, position);
      }),
    [child, paneKey, paneLimit, setPanes],
  );
};
