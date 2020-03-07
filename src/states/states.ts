import { User } from '../api/users';
import { List, OrderedMap } from 'immutable';
import { Id } from '../id';
import { SpaceWithMember } from '../api/spaces';
import { ChannelWithMember } from '../api/channels';
import { Chat } from './chat';

export type MySpaces = OrderedMap<Id, SpaceWithMember>;
export type MyChannels = OrderedMap<Id, ChannelWithMember>;

export interface My {
  profile: User;
  spaces: MySpaces;
  channels: MyChannels;
}

export type MyState = My | 'GUEST';

export interface Alert {
  level: 'ERROR' | 'SUCCESS' | 'INFO';
  message: string;
  created: number;
}

interface Appearance {
  sidebar: boolean;
}

const appearanceStateInit: Appearance = {
  sidebar: localStorage.getItem('sidebar') === 'true',
};

export interface State {
  my: MyState;
  alertList: List<Alert>;
  chat: Chat | undefined;
  appearance: Appearance;
}

export const initState: State = {
  my: 'GUEST',
  alertList: List(),
  chat: undefined,
  appearance: appearanceStateInit,
};
