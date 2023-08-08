import { Map } from 'immutable';
import { Action, EventReceived } from '../actions';
import { Events } from '../api/events';
import { Id } from '../utils/id';
import { ChatState } from './chatState';
import { ChatStateMap, chatStateMapReducer } from './chatStateMap';
import { flashReducer, FlashState, initFlashState } from './flash';
import { initProfileState, profileReducer, ProfileState } from './profile';
import { initUiState, uiReducer, UiState } from './ui';

export interface ApplicationState {
  profile: ProfileState | undefined;
  flash: FlashState;
  ui: UiState;
  chatStates: ChatStateMap;
}

export const handleBatch = (state: ApplicationState, action: EventReceived): ApplicationState => {
  if (action.event.body.type !== 'BATCH') {
    return state;
  }
  for (const encodedEvent of action.event.body.encodedEvents) {
    try {
      const event = JSON.parse(encodedEvent) as Events;
      const action: EventReceived = { type: 'EVENT_RECEIVED', event };
      state = applicationReducer(state, action);
    } catch (e) {
      console.error(e);
    }
  }
  return state;
};

export const applicationReducer = (
  state: ApplicationState = initApplicationState,
  action: Action,
): ApplicationState => {
  if (action.type === 'EVENT_RECEIVED' && action.event.body.type === 'BATCH') {
    return handleBatch(state, action);
  }
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
