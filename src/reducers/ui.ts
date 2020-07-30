import { chatReducer, ChatState } from '@/reducers/chat';
import { Space, SpaceWithRelated } from '@/api/spaces';
import { Action } from '@/actions';
import { AppResult } from '@/api/request';
import { errLoading } from '@/api/error';
import { JoinedSpace, LeftSpace, SpaceEdited } from '@/actions/profile';
import { Id } from '@/utils/id';

export interface UiState {
  exploreSpaceList: AppResult<Space[]>;
  chat: ChatState | undefined;
  spacePage: AppResult<SpaceWithRelated>;
}

export const initUiState: UiState = {
  exploreSpaceList: errLoading(),
  chat: undefined,
  spacePage: errLoading(),
};

const handleJoinSpace = ({ spacePage, ...state }: UiState, action: JoinedSpace): UiState => {
  spacePage = spacePage.map(({ members, ...rest }) => {
    members = members.filter((member) => member.userId !== action.member.userId);
    members.push(action.member);
    return { ...rest, members };
  });
  return { ...state, spacePage };
};

const handleLeftSpace = ({ spacePage, ...state }: UiState, action: LeftSpace, userId: Id | undefined): UiState => {
  spacePage = spacePage.map(({ members, ...rest }) => {
    members = members.filter((member) => member.userId !== userId);
    return { ...rest, members };
  });
  return { ...state, spacePage };
};

const handleSpaceEdited = ({ spacePage, ...state }: UiState, action: SpaceEdited): UiState => {
  const { space } = action;
  spacePage = spacePage.map((spaceWithRelated) => ({ ...spaceWithRelated, space }));
  return { ...state, spacePage };
};

export function uiReducer(state: UiState = initUiState, action: Action, userId: Id | undefined): UiState {
  switch (action.type) {
    case 'RESET_UI':
      return initUiState;
    case 'EXPLORE_SPACE_LOADED':
      return { ...state, exploreSpaceList: action.spaces };
    case 'SPACE_LOADED':
      return { ...state, spacePage: action.space };
    case 'JOINED_SPACE':
      return handleJoinSpace(state, action);
    case 'LEFT_SPACE':
      return handleLeftSpace(state, action, userId);
    case 'SPACE_EDITED':
      return handleSpaceEdited(state, action);
  }
  return {
    ...state,
    chat: chatReducer(state.chat, action),
  };
}
