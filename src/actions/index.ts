import { DismissInformation, Information } from './information';
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
import { ChannelEventReceived, ChatLoaded, CloseChat, LoadChat, LoadMessages } from './chat';
import { ExploreSpaceLoaded, ResetUi, SpaceLoaded, SwitchChat, SwitchExploreSpace } from '@/actions/ui';

export type Action =
  | Information
  | DismissInformation
  | LoggedIn
  | LoggedOut
  | UserEdited
  | JoinedSpace
  | SpaceEdited
  | LeftSpace
  | JoinedChannel
  | LeftChannel
  | ChannelMemberEdited
  | LoadChat
  | ChatLoaded
  | CloseChat
  | LoadMessages
  | ChannelEventReceived
  | SwitchExploreSpace
  | ExploreSpaceLoaded
  | SwitchChat
  | ResetUi
  | SpaceLoaded;
