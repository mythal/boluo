import { User } from '../api/users';
import { List, OrderedMap } from 'immutable';
import { SpaceWithMember } from '../api/spaces';
import { ChannelWithMember } from '../api/channels';
import { ERROR, INFO, SUCCESS } from './actions';
import { Id } from '../id';

export const GUEST = 'GUEST';
export type GUEST = typeof GUEST;

export const LOADING = 'LOADING';
export type LOADING = typeof LOADING;

export type MeState = User | GUEST;

export type MySpaces = OrderedMap<Id, SpaceWithMember>;
export type MyChannels = OrderedMap<Id, ChannelWithMember>;
export interface My {
  mySpaces: MySpaces;
  myChannels: MyChannels;
}

export interface Information {
  level: ERROR | SUCCESS | INFO;
  message: string;
  created: number;
}

export type State = {
  me: MeState;
  informationList: List<Information>;
} & My;

export const initMyState: My = {
  mySpaces: OrderedMap(),
  myChannels: OrderedMap(),
};

export const initState: State = {
  me: GUEST,
  informationList: List(),
  ...initMyState,
};
