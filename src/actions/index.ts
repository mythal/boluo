import {
  ChannelMemberEdited,
  JoinedChannel,
  JoinedSpace,
  LeftChannel,
  LeftSpace,
  LoggedIn,
  LoggedOut,
  SettingsUpdated,
  SpaceEdited,
  UserEdited,
} from './profile';
import {
  ChannelEventReceived,
  ChatFilter,
  ChatLoaded,
  ChatUpdate,
  CloseChat,
  FinishMoveMessage,
  LoadMessages,
  MovingMessage,
  ResetMessageMoving,
  RevealMessage,
  SplitPane,
  StartEditMessage,
  StartMoveMessage,
  StopEditMessage,
  SwitchActivePane,
  ToggleShowFolded,
} from './chat';
import {
  ExploreSpaceLoaded,
  ResetUi,
  SpaceDeleted,
  SpaceLoaded,
  SpaceUpdated,
  SwitchChat,
  SwitchExploreSpace,
  UserLoaded,
} from './ui';
import { DismissFlash, ShowFlash } from './flash';

export type Action =
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
  | ChannelEventReceived
  | SwitchExploreSpace
  | ExploreSpaceLoaded
  | SwitchChat
  | ResetUi
  | SpaceLoaded
  | UserLoaded
  | ChatFilter
  | StartEditMessage
  | StopEditMessage
  | StartMoveMessage
  | FinishMoveMessage
  | MovingMessage
  | RevealMessage
  | ResetMessageMoving
  | ShowFlash
  | DismissFlash
  | SwitchActivePane
  | SplitPane
  | ToggleShowFolded;
