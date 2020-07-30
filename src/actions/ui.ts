import { Space, SpaceWithRelated } from '@/api/spaces';
import { AppResult, get } from '@/api/request';
import { Dispatch } from '@/store';
import { Id } from '@/utils/id';

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

export interface SwitchChat {
  type: 'SWITCH_CHAT';
}

export interface SpaceLoaded {
  type: 'SPACE_LOADED';
  space: AppResult<SpaceWithRelated>;
}

export const loadSpace = (id: Id) => (dispatch: Dispatch) => {
  get('/spaces/query_with_related', { id }).then((space) => dispatch({ type: 'SPACE_LOADED', space }));
};
