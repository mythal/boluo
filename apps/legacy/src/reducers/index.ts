import { Map } from 'immutable';
import { type Action, EventReceived } from '../actions';
import { Events } from '../api/events';
import { type Id } from '../utils/id';
import { type ChatState } from './chatState';
import { type ChatStateMap, chatStateMapReducer } from './chatStateMap';
import { flashReducer, type FlashState, initFlashState } from './flash';
import { initProfileState, profileReducer, type ProfileState } from './profile';
import { initUiState, uiReducer, type UiState } from './ui';

export interface ApplicationState {
  profile: ProfileState | undefined;
  flash: FlashState;
  ui: UiState;
  chatStates: ChatStateMap;
}

export const applicationReducer = (
  state: ApplicationState = initApplicationState,
  action: Action,
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
