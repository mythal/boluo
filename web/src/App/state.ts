import { List } from 'immutable';
import { Pane } from '../Pane/Pane';

export interface AppState {
  panes: List<Pane>;
}

export const appStateInit: AppState = {
  panes: List(),
};
