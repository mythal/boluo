import {
  ChannelMemberEdited,
  JoinedChannel,
  JoinedSpace,
  LeftChannel,
  LeftSpace,
  LoggedIn,
  LoggedOut,
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
  SplitPane,
  StartEditMessage,
  StartMoveMessage,
  StopEditMessage,
  SwitchActivePane,
} from './chat';
import {
  ExploreSpaceLoaded,
  ResetUi,
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
  | JoinedSpace
  | SpaceEdited
  | SpaceUpdated
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
  | ResetMessageMoving
  | ShowFlash
  | DismissFlash
  | SwitchActivePane
  | SplitPane;
