import { initProfileState, profileReducer, ProfileState } from './profile';
import { informationReducer, InformationState, initInformationState } from './information';
import { Action } from '@/actions';
import { initUiState, uiReducer, UiState } from '@/reducers/ui';

export interface ApplicationState {
  profile: ProfileState | undefined;
  information: InformationState;
  ui: UiState;
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
  };
};

export const initApplicationState: ApplicationState = {
  profile: initProfileState,
  information: initInformationState,
  ui: initUiState,
};
