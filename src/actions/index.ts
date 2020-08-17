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
  LoadMessages,
  StartEditMessage,
  StopEditMessage,
  ToggleMemberList,
} from './chat';
import { ExploreSpaceLoaded, ResetUi, SpaceLoaded, SwitchChat, SwitchExploreSpace, UserLoaded } from './ui';
import { DismissFlash, ShowFlash } from './flash';

export type Action =
  | LoggedIn
  | LoggedOut
  | UserEdited
  | JoinedSpace
  | SpaceEdited
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
  | ToggleMemberList
  | StartEditMessage
  | StopEditMessage
  | ShowFlash
  | DismissFlash;
