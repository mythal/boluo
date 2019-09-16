import { AppState } from './state';
import { AppAction, ClosePane, OpenChannel } from './actions';

type Reducer<T extends AppAction = AppAction> = (state: AppState, action: T) => AppState;

const handleOpenChannel: Reducer<OpenChannel> = (state, action) => {
  const sameIdPane = state.panes.filter(pane => pane.id === action.id);
  if (sameIdPane.size !== 0) {
    return state;
  }
  const panes = state.panes.push({ type: 'channel', id: action.id, fold: false });
  return { ...state, panes };
};

const handleClosePane: Reducer<ClosePane> = (state, action) => {
  const panes = state.panes.filter(pane => pane.id !== action.id);
  return { ...state, panes };
};

export const appReducer: Reducer = (state, action) => {
  switch (action.type) {
    case 'OPEN_CHANNEL':
      return handleOpenChannel(state, action);
    case 'CLOSE_PANE':
      return handleClosePane(state, action);
    default:
      return state;
  }
};
