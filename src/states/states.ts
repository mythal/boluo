import { User } from '../api/users';
import { List, OrderedMap } from 'immutable';
import { Id } from '../id';
import { SpaceWithMember } from '../api/spaces';
import { Channel, ChannelMember, ChannelWithMember, ColorList } from '../api/channels';
import { Message, Preview } from '../api/messages';

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

export type ChatItem =
  | { type: 'MESSAGE'; message: Message }
  | { type: 'PREVIEW'; preview: Preview }
  | { type: 'DAY_DIVIDER'; date: Date };

interface Chat {
  channel: Channel;
  members: List<ChannelMember>;
  colorList: ColorList;
  items: OrderedMap<Id, ChatItem>;
  loading: boolean;
  latest: number;
  oldest: number;
}

interface Appearance {
  sidebar: boolean;
}

const appearanceStateInit: Appearance = {
  sidebar: false,
};

export interface State {
  my: MyState;
  alertList: List<Alert>;
  chat: Chat | 'LOADING';
  appearance: Appearance;
}

export const initState: State = {
  my: 'GUEST',
  alertList: List(),
  chat: 'LOADING',
  appearance: appearanceStateInit,
};
