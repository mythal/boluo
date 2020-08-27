import { initProfileState, profileReducer, ProfileState } from './profile';
import { Action } from '../actions';
import { initUiState, uiReducer, UiState } from './ui';
import { chatReducer, ChatState } from './chat';
import { flashReducer, FlashState, initFlashState } from './flash';

export interface ApplicationState {
  profile: ProfileState | undefined;
  flash: FlashState;
  ui: UiState;
  chatPane: Array<ChatState | undefined>;
  activePane: number;
  splitPane: boolean;
}

export const applicationReducer = (
  state: ApplicationState = initApplicationState,
  action: Action
): ApplicationState => {
  const profile = profileReducer(state.profile, action);
  const userId = profile?.user.id;
  let chatPane = [...state.chatPane];
  if ('pane' in action) {
    chatPane[action.pane] = chatReducer(chatPane[action.pane], action, userId);
  } else {
    chatPane = state.chatPane.map((chat) => chatReducer(chat, action, userId));
  }
  let { activePane, splitPane } = state;
  if (action.type === 'SWITCH_ACTIVE_PANE') {
    activePane = action.pane;
  } else if (action.type === 'SPLIT_PANE') {
    splitPane = action.split;
  }

  return {
    profile,
    ui: uiReducer(state.ui, action, userId),
    flash: flashReducer(state.flash, action),
    chatPane,
    activePane,
    splitPane,
  };
};

export const initApplicationState: ApplicationState = {
  profile: initProfileState,
  ui: initUiState,
  flash: initFlashState,
  chatPane: [undefined, undefined],
  activePane: 0,
  splitPane: false,
};
