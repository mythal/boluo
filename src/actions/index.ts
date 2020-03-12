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
} from './profile';
import { ChannelEventReceived, CloseChat, LoadChat, LoadMessages } from './chat';

export type Action =
  | Information
  | DismissInformation
  | LoggedIn
  | LoggedOut
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
