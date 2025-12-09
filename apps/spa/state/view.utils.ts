import { type Pane, type PaneData } from './view.types';

export const findPane = (panes: Pane[], predicate: (pane: PaneData) => boolean) => {
  for (const pane of panes) {
    if (predicate(pane)) {
      return pane;
    }
    const childPane = pane.child?.pane;
    if (childPane && predicate(childPane)) {
      return childPane;
    }
  }
  return null;
};
