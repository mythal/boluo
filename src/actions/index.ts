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
import { ChannelEventReceived, CloseChat, LoadChat, LoadMessages } from './chat';

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
  | CloseChat
  | LoadMessages
  | ChannelEventReceived;
