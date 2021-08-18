import { initProfileState, profileReducer, ProfileState } from './profile';
import { Action } from '../actions';
import { initUiState, uiReducer, UiState } from './ui';
import { Map } from 'immutable';
import { chatReducer, ChatState } from './chatState';
import { flashReducer, FlashState, initFlashState } from './flash';
import { Id } from '../utils/id';
import { ChatStateMap, chatStateMapReducer, handleSpaceLoaded, handleSpaceUpdate } from './chatStateMap';

export interface ApplicationState {
  profile: ProfileState | undefined;
  flash: FlashState;
  ui: UiState;
  chatStates: ChatStateMap;
}

export const applicationReducer = (
  state: ApplicationState = initApplicationState,
  action: Action
): ApplicationState => {
  const profile = profileReducer(state.profile, action);
  const userId = profile?.user.id;
  const chatStates = chatStateMapReducer(state.chatStates, action, userId);

  return {
    profile,
    ui: uiReducer(state.ui, action, userId),
    flash: flashReducer(state.flash, action),
    chatStates,
  };
};

export const initApplicationState: ApplicationState = {
  profile: initProfileState,
  ui: initUiState,
  flash: initFlashState,
  chatStates: Map<Id, ChatState | undefined>(),
};
