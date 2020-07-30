import { OrderedMap } from 'immutable';
import { DismissInformation, Information } from '@/actions/information';
import { Action } from '@/actions';
import { Id } from '@/utils/id';

export type InformationState = OrderedMap<Id, Information>;

const addInformation = (state: InformationState, information: Information): InformationState => {
  return state.set(information.id, information);
};

const removeInformation = (state: InformationState, { id }: DismissInformation): InformationState => {
  return state.remove(id);
};

export const informationReducer = (state: InformationState, action: Action): InformationState => {
  switch (action.type) {
    case 'INFORMATION':
      return addInformation(state, action);
    case 'DISMISS_INFORMATION':
      return removeInformation(state, action);
  }
  return state;
};

export const initInformationState: InformationState = OrderedMap();
