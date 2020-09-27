import { Space, SpaceWithRelated } from '../api/spaces';
import { AppResult, get } from '../api/request';
import { Dispatch } from '../store';
import { Id } from '../utils/id';
import { User } from '../api/users';

export const SWITCH_EXPLORE_SPACE = 'SWITCH_EXPLORE_SPACE';

export interface SwitchExploreSpace {
  type: typeof SWITCH_EXPLORE_SPACE;
}

export interface ResetUi {
  type: 'RESET_UI';
}

export const resetUi = (): ResetUi => ({ type: 'RESET_UI' });

export interface ExploreSpaceLoaded {
  type: 'EXPLORE_SPACE_LOADED';
  spaces: AppResult<Space[]>;
}

export const loadExploreSpace = () => (dispatch: Dispatch) => {
  get('/spaces/list').then((spaces) => dispatch({ type: 'EXPLORE_SPACE_LOADED', spaces }));
};

export const searchSpaces = (searchText: string) => (dispatch: Dispatch) => {
  get('/spaces/search', { search: searchText }).then((spaces) => dispatch({ type: 'EXPLORE_SPACE_LOADED', spaces }));
};

export interface SwitchChat {
  type: 'SWITCH_CHAT';
}

export interface SpaceLoaded {
  type: 'SPACE_LOADED';
  spaceId: Id;
  result: AppResult<SpaceWithRelated>;
}

export interface SpaceUpdated {
  type: 'SPACE_UPDATED';
  spaceWithRelated: SpaceWithRelated;
}

export interface SpaceDeleted {
  type: 'SPACE_DELETED';
  spaceId: Id;
}

export const loadSpace = (id: Id, token?: string) => (dispatch: Dispatch) => {
  get('/spaces/query_with_related', { id, token }).then((result) => {
    const action: SpaceLoaded = { type: 'SPACE_LOADED', result, spaceId: id };
    dispatch(action);
  });
};

export interface UserLoaded {
  type: 'USER_LOADED';
  userId: Id;
  result: AppResult<User>;
}

export const loadUser = (id: Id) => (dispatch: Dispatch) => {
  get('/users/query', { id }).then((result) => {
    const action: UserLoaded = { type: 'USER_LOADED', result, userId: id };
    dispatch(action);
  });
};
