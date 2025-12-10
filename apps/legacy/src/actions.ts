import { type ReactNode } from 'react';
import { type Channel, type ChannelMember, type ChannelWithMember } from './api/channels';
import { type Events } from './api/events';
import { type Message } from './api/messages';
import { type AppResult, get } from './api/request';
import {
  type Space,
  type SpaceMember,
  type SpaceWithMember,
  type SpaceWithRelated,
} from './api/spaces';
import { type Settings, type User } from './api/users';
import { type Information, type InformationLevel } from './information';
import { type ChatState, type Compose, type UserItem } from './reducers/chatState';
import { type MessageItem, type PreviewItem } from './states/chat-item-set';
import { type Dispatch } from './store';
import { type Id, newId } from './utils/id';
import { Err, Ok } from './utils/result';
import { notFound } from './api/error';

export interface CloseChat {
  type: 'CLOSE_CHAT';
  pane: Id;
  id: Id;
}

export interface LoadMessages {
  type: 'LOAD_MESSAGES';
  messages: Message[];
  finished: boolean;
  pane: Id;
}

export interface EventReceived {
  type: 'EVENT_RECEIVED';
  event: Events;
}

export interface ChatLoaded {
  type: 'CHAT_LOADED';
  chat: ChatState;
  pane: Id;
}

export interface ChatUpdate {
  type: 'CHAT_UPDATE';
  id: Id;
  chat: Partial<ChatState>;
  pane: Id;
}

export interface ChatFilter {
  type: 'CHAT_FILTER';
  pane: Id;
  filter: ChatState['filter'];
}

export const chatNoneFilter = (pane: Id): ChatFilter => ({
  type: 'CHAT_FILTER',
  filter: 'NONE',
  pane,
});
export const chatInGameFilter = (pane: Id): ChatFilter => ({
  type: 'CHAT_FILTER',
  filter: 'IN_GAME',
  pane,
});
export const chatOutGameFilter = (pane: Id): ChatFilter => ({
  type: 'CHAT_FILTER',
  filter: 'OUT_GAME',
  pane,
});

export interface ToggleShowFolded {
  type: 'TOGGLE_SHOW_FOLDED';
}

export interface StartEditMessage {
  type: 'START_EDIT_MESSAGE';
  message: Message;
  pane: Id;
}

export interface StartMoveMessage {
  type: 'START_MOVE_MESSAGE';
  pane: Id;
}

export interface FinishMoveMessage {
  type: 'FINISH_MOVE_MESSAGE';
  pane: Id;
}

export interface MovingMessage {
  type: 'MOVING_MESSAGE';
  message: MessageItem;
  targetItem: MessageItem | PreviewItem | undefined;
  pane: Id;
}

export interface RevealMessage {
  type: 'REVEAL_MESSAGE';
  message: Message;
  pane: Id;
}

export interface ResetMessageMoving {
  type: 'RESET_MESSAGE_MOVING';
  messageId: Id;
  pane: Id;
}

export interface SwitchActivePane {
  type: 'SWITCH_ACTIVE_PANE';
  pane: Id;
}

export interface SplitPane {
  type: 'SPLIT_PANE';
  split: boolean;
}

export interface ShowFlash {
  type: 'SHOW_FLASH';
  information: Information;
}

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
  get('/spaces/search', { search: searchText }).then((spaces) =>
    dispatch({ type: 'EXPLORE_SPACE_LOADED', spaces }),
  );
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

export interface ConnectSpace {
  type: 'CONNECT_SPACE';
  spaceId: Id;
  connection: WebSocket;
}

export const connectSpace = (spaceId: Id, connection: WebSocket): ConnectSpace => {
  return {
    type: 'CONNECT_SPACE',
    spaceId,
    connection,
  };
};

export interface UserLoaded {
  type: 'USER_LOADED';
  userId: Id;
  result: AppResult<User>;
}

export const loadUser = (id: Id) => (dispatch: Dispatch) => {
  get('/users/query', { id }).then((result) => {
    let action: UserLoaded;
    if (result.isOk) {
      if (result.value == null) {
        action = { type: 'USER_LOADED', result: notFound('没找到用户'), userId: id };
      } else {
        action = { type: 'USER_LOADED', result: new Ok(result.value), userId: id };
      }
    } else {
      action = { type: 'USER_LOADED', result: new Err(result.value), userId: id };
    }
    dispatch(action);
  });
};

export interface DismissFlash {
  type: 'DISMISS_FLASH';
  id: Id;
}

export const dismissFlash = (id: Id): DismissFlash => ({
  type: 'DISMISS_FLASH',
  id,
});
export const showFlash =
  (level: InformationLevel, content: ReactNode, timeout: number | null = 5000) =>
  (dispatch: Dispatch) => {
    const id = newId();
    dispatch({
      type: 'SHOW_FLASH',
      information: { content, level, id },
    });
    if (timeout != null) {
      setTimeout(() => {
        dispatch({
          type: 'DISMISS_FLASH',
          id,
        });
      }, timeout);
    }
  };

export interface LoggedIn {
  type: 'LOGGED_IN';
  user: User;
  settings: Settings;
  mySpaces: SpaceWithMember[];
  myChannels: ChannelWithMember[];
}

export interface SettingsUpdated {
  type: 'SETTINGS_UPDATED';
  settings: Settings;
}

export interface UserEdited {
  type: 'USER_EDITED';
  user: User;
}

export interface LoggedOut {
  type: 'LOGGED_OUT';
}

export interface JoinedSpace {
  type: 'JOINED_SPACE';
  space: Space;
  member: SpaceMember;
}

export interface SpaceEdited {
  type: 'SPACE_EDITED';
  space: Space;
}

export interface LeftSpace {
  type: 'LEFT_SPACE';
  spaceId: Id;
}

export interface JoinedChannel {
  type: 'JOINED_CHANNEL';
  channel: Channel;
  member: ChannelMember;
}

export interface LeftChannel {
  type: 'LEFT_CHANNEL';
  id: Id;
}

export interface ChannelMemberEdited {
  type: 'CHANNEL_MEMBER_EDITED';
  channelId: Id;
  member: ChannelMember;
}

export interface ComposeInitialized {
  type: 'COMPOSE_INITIALIZED';
  pane: Id;
}

export interface SetInputName {
  type: 'SET_INPUT_NAME';
  pane: Id;
  name: string;
}

export interface ComposeSending {
  type: 'COMPOSE_SENDING';
  pane: Id;
}

export interface ComposeSent {
  type: 'COMPOSE_SENT';
  pane: Id;
}

export interface SetComposeMedia {
  type: 'SET_COMPOSE_MEDIA';
  pane: Id;
  media?: File;
}

export interface SetComposeSource {
  type: 'SET_COMPOSE_SOURCE';
  pane: Id;
  source: string;
}

export interface SetWhisperTo {
  type: 'SET_WHISPER_TO';
  pane: Id;
  whisperTo: UserItem[] | null | undefined;
}

export interface SetIsAction {
  type: 'SET_IS_ACTION';
  pane: Id;
  isAction: boolean | 'TOGGLE';
}
export interface SetInGame {
  type: 'SET_IN_GAME';
  pane: Id;
  inGame: boolean | 'TOGGLE';
}

export interface SetBroadcast {
  type: 'SET_BROADCAST';
  pane: Id;
  broadcast: boolean | 'TOGGLE';
}

export interface CancelEdit {
  type: 'CANCEL_EDIT';
  pane: Id;
}

export interface ResetComposeAfterSent {
  type: 'RESET_COMPOSE_AFTER_SENT';
  pane: Id;
  newId: Id;
}

export interface RestoreComposeState {
  type: 'RESTORE_COMPOSE_STATE';
  pane: Id;
  compose: Compose;
}

export interface ComposeSendFailed {
  type: 'COMPOSE_SEND_FAILED';
  pane: Id;
}

export interface ComposeEditFailed {
  type: 'COMPOSE_EDIT_FAILED';
  pane: Id;
}

export interface AddDice {
  type: 'ADD_DICE';
  pane: Id;
  dice: string;
}

export interface FocusChannel {
  type: 'FOCUS_CHANNEL';
  pane: Id;
}

export interface UnfocusChannel {
  type: 'UNFOCUS_CHANNEL';
  pane: Id;
}

export interface ChangeBaseUrl {
  type: 'CHANGE_BASE_URL';
  baseUrl: string;
}

export type Action =
  | CancelEdit
  | SetBroadcast
  | SetInGame
  | AddDice
  | SetWhisperTo
  | SetComposeSource
  | SetComposeMedia
  | SetIsAction
  | ComposeSent
  | ComposeSending
  | ComposeInitialized
  | ComposeEditFailed
  | ResetComposeAfterSent
  | RestoreComposeState
  | ComposeSendFailed
  | SetInputName
  | LoggedIn
  | LoggedOut
  | UserEdited
  | SettingsUpdated
  | JoinedSpace
  | SpaceEdited
  | SpaceUpdated
  | SpaceDeleted
  | LeftSpace
  | JoinedChannel
  | LeftChannel
  | ChannelMemberEdited
  | ChatLoaded
  | CloseChat
  | ChatUpdate
  | LoadMessages
  | EventReceived
  | SwitchExploreSpace
  | ExploreSpaceLoaded
  | SwitchChat
  | ResetUi
  | SpaceLoaded
  | UserLoaded
  | ChatFilter
  | StartEditMessage
  | StartMoveMessage
  | FinishMoveMessage
  | MovingMessage
  | RevealMessage
  | ResetMessageMoving
  | ShowFlash
  | DismissFlash
  | SwitchActivePane
  | SplitPane
  | ToggleShowFolded
  | FocusChannel
  | UnfocusChannel
  | ConnectSpace
  | ChangeBaseUrl;
