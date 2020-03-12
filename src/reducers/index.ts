import { initProfileState, profileReducer, ProfileState } from './profile';
import { informationReducer, InformationState, initInformationState } from './information';
import { Action } from '../actions';
import { chatReducer, ChatState, initChatState } from './chat';

export interface ApplicationState {
  profile: ProfileState | undefined;
  information: InformationState;
  chat: ChatState | undefined;
}

export const applicationReducer = (state: ApplicationState, action: Action): ApplicationState => {
  return {
    profile: profileReducer(state.profile, action),
    information: informationReducer(state.information, action),
    chat: chatReducer(state.chat, action),
  };
};

export const initApplicationState: ApplicationState = {
  profile: initProfileState,
  information: initInformationState,
  chat: initChatState,
};
