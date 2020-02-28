import { User } from '../api/users';
import { List, OrderedMap, Map } from 'immutable';
import { Id } from '../id';
import { SpaceWithMember } from '../api/spaces';
import { Channel, ChannelMember, ChannelWithMember } from '../api/channels';
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
  | { type: 'MESSAGE'; message: Message; date: Date }
  | { type: 'PREVIEW'; preview: Preview; date: Date }
  | { type: 'DAY_DIVIDER'; date: Date };

export const newDayDivider = (date: Date): ChatItem => ({ type: 'DAY_DIVIDER', date });

export interface Chat {
  channel: Channel;
  members: ChannelMember[];
  colorMap: Map<Id, string>;
  itemList: List<ChatItem>;
  previewMap: Map<Id, Id>;
  finished: boolean;
  oldest: number;
  latest: number;
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
  chat: Chat | undefined;
  appearance: Appearance;
}

export const initState: State = {
  my: 'GUEST',
  alertList: List(),
  chat: undefined,
  appearance: appearanceStateInit,
};
