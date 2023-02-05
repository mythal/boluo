import { OrderedMap } from 'immutable';
import { Action } from '../actions';
import { Information } from '../information';
import { Id } from '../utils/id';

export type FlashState = OrderedMap<Id, Information>;

export const initFlashState: FlashState = OrderedMap<Id, Information>();

export const flashReducer = (state: FlashState, action: Action): FlashState => {
  switch (action.type) {
    case 'SHOW_FLASH':
      return state.set(action.information.id, action.information);
    case 'DISMISS_FLASH':
      return state.remove(action.id);
  }
  return state;
};
