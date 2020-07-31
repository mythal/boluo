import { initProfileState, profileReducer, ProfileState } from './profile';
import { informationReducer, InformationState, initInformationState } from './information';
import { Action } from '@/actions';
import { initUiState, uiReducer, UiState } from '@/reducers/ui';
import { chatReducer, ChatState, initChatState } from '@/reducers/chat';

export interface ApplicationState {
  profile: ProfileState | undefined;
  information: InformationState;
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
    information: informationReducer(state.information, action),
    ui: uiReducer(state.ui, action, userId),
    chat: chatReducer(state.chat, action),
  };
};

export const initApplicationState: ApplicationState = {
  profile: initProfileState,
  information: initInformationState,
  chat: initChatState,
  ui: initUiState,
};
