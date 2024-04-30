import { useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { findNextPaneKey, panesAtom } from '../state/view.atoms';
import { insertPaneByPosition, NewPanePosition, Pane, PaneData } from '../state/view.types';

export const usePaneToggle = () => {
  const setPanes = useSetAtom(panesAtom);
  return useCallback(
    (pane: PaneData, position: NewPanePosition = 'HEAD') =>
      setPanes((panes) => {
        if (pane.type === 'EMPTY') return panes;
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
    [setPanes],
  );
};
