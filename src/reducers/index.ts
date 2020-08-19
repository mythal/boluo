import { initProfileState, profileReducer, ProfileState } from './profile';
import { Action } from '../actions';
import { initUiState, uiReducer, UiState } from './ui';
import { chatReducer, ChatState, initChatState } from './chat';
import { flashReducer, FlashState, initFlashState } from './flash';

export interface ApplicationState {
  profile: ProfileState | undefined;
  flash: FlashState;
  ui: UiState;
  chat: ChatState | undefined;
}

export const applicationReducer = (
  state: ApplicationState = initApplicationState,
  action: Action
): ApplicationState => {
  const userId = state.profile?.user.id;
  return {
    profile: profileReducer(state.profile, action),
    ui: uiReducer(state.ui, action, userId),
    chat: chatReducer(state.chat, action, userId),
    flash: flashReducer(state.flash, action),
  };
};

export const initApplicationState: ApplicationState = {
  profile: initProfileState,
  chat: initChatState,
  ui: initUiState,
  flash: initFlashState,
};
