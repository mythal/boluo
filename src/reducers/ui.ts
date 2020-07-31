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
  const result = spaceSet.get(action.space.id);
  const next = result?.map(({ members, ...rest }) => {
    members = members.filter((member) => member.userId !== action.member.userId);
    members.push(action.member);
    return { ...rest, members };
  });
  if (next) {
    spaceSet = spaceSet.set(action.space.id, next);
  }
  return { ...state, spaceSet };
};

const handleLeftSpace = ({ spaceSet, ...state }: UiState, action: LeftSpace, userId: Id | undefined): UiState => {
  const spaceWithRelated = spaceSet.get(action.spaceId)?.map(({ members, ...rest }) => {
    members = members.filter((member) => member.userId !== userId);
    return { ...rest, members };
  });
  if (spaceWithRelated) {
    spaceSet.set(action.spaceId, spaceWithRelated);
  }
  return { ...state, spaceSet };
};

const handleSpaceEdited = ({ spaceSet, ...state }: UiState, { space }: SpaceEdited): UiState => {
  const spaceWithRelated = spaceSet.get(space.id)?.map((spaceWithRelated) => ({ ...spaceWithRelated, space }));
  if (spaceWithRelated) {
    spaceSet = spaceSet.set(space.id, spaceWithRelated);
  }
  return { ...state, spaceSet };
};

const handleUserEdited = ({ userSet, ...state }: UiState, { user }: UserEdited): UiState => {
  const userResult = userSet.get(user.id)?.map(() => user);
  if (userResult) {
    userSet = userSet.set(user.id, userResult);
  }
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
