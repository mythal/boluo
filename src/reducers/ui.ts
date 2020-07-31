import { Space, SpaceWithRelated } from '@/api/spaces';
import { Action } from '@/actions';
import { AppResult } from '@/api/request';
import { errLoading } from '@/api/error';
import { JoinedSpace, LeftSpace, SpaceEdited, UserEdited } from '@/actions/profile';
import { Id } from '@/utils/id';
import { Map } from 'immutable';
import { User } from '@/api/users';
import { Ok } from '@/utils/result';

export interface UiState {
  exploreSpaceList: AppResult<Space[]>;
  spaceSet: Map<Id, AppResult<SpaceWithRelated>>;
  userSet: Map<Id, AppResult<User>>;
}

export const initUiState: UiState = {
  exploreSpaceList: errLoading(),
  spaceSet: Map(),
  userSet: Map(),
};

const handleJoinSpace = ({ spaceSet, ...state }: UiState, action: JoinedSpace): UiState => {
  spaceSet = spaceSet.update(action.space.id, (result) =>
    result.map(({ members, ...rest }) => {
      members = members.filter((member) => member.userId !== action.member.userId);
      members.push(action.member);
      return { ...rest, members };
    })
  );
  return { ...state, spaceSet };
};

const handleLeftSpace = ({ spaceSet, ...state }: UiState, action: LeftSpace, userId: Id | undefined): UiState => {
  spaceSet = spaceSet.update(action.spaceId, (result) =>
    result.map(({ members, ...rest }) => {
      members = members.filter((member) => member.userId !== userId);
      return { ...rest, members };
    })
  );
  return { ...state, spaceSet };
};

const handleSpaceEdited = ({ spaceSet, ...state }: UiState, { space }: SpaceEdited): UiState => {
  spaceSet = spaceSet.update(space.id, (result) => result.map((spaceWithRelated) => ({ ...spaceWithRelated, space })));
  return { ...state, spaceSet };
};

const handleUserEdited = ({ userSet, ...state }: UiState, { user }: UserEdited): UiState => {
  userSet = userSet.set(user.id, new Ok(user));
  return { ...state, userSet };
};

export function uiReducer(state: UiState = initUiState, action: Action, userId: Id | undefined): UiState {
  switch (action.type) {
    case 'EXPLORE_SPACE_LOADED':
      return { ...state, exploreSpaceList: action.spaces };
    case 'SPACE_LOADED':
      return { ...state, spaceSet: state.spaceSet.set(action.spaceId, action.result) };
    case 'USER_LOADED':
      return { ...state, userSet: state.userSet.set(action.userId, action.result) };
    case 'LOGGED_IN':
      return { ...state, userSet: state.userSet.set(action.user.id, new Ok(action.user)) };
    case 'USER_EDITED':
      return handleUserEdited(state, action);
    case 'JOINED_SPACE':
      return handleJoinSpace(state, action);
    case 'LEFT_SPACE':
      return handleLeftSpace(state, action, userId);
    case 'SPACE_EDITED':
      return handleSpaceEdited(state, action);
  }
  return state;
}
