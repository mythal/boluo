import { initProfileState, profileReducer, ProfileState } from './profile';
import { Action } from '@/actions';
import { initUiState, uiReducer, UiState } from '@/reducers/ui';
import { chatReducer, ChatState, initChatState } from '@/reducers/chat';
import { flashReducer, FlashState, initFlashState } from '@/reducers/flash';

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
    chat: chatReducer(state.chat, action, state.profile?.user.id),
    flash: flashReducer(state.flash, action),
  };
};

export const initApplicationState: ApplicationState = {
  profile: initProfileState,
  chat: initChatState,
  ui: initUiState,
  flash: initFlashState,
};
