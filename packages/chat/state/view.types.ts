import { makeId } from '@boluo/utils';

export interface SpacePane {
  type: 'SPACE';
  spaceId: string;
}
export interface ChannelPane {
  type: 'CHANNEL';
  channelId: string;
}

export interface SettingsPane {
  type: 'SETTINGS';
}

export interface LoginPane {
  type: 'LOGIN';
}

export interface WelcomePane {
  type: 'WELCOME';
}

export interface HelpPane {
  type: 'HELP';
}

export interface SpaceMembersPane {
  type: 'SPACE_MEMBERS';
  spaceId: string;
}

export interface SpaceSettingsPane {
  type: 'SPACE_SETTINGS';
  spaceId: string;
}

export interface ChannelSettingsPane {
  type: 'CHANNEL_SETTINGS';
  channelId: string;
}

export interface CreateChannelPane {
  type: 'CREATE_CHANNEL';
  spaceId: string;
}

export interface CreateSpacePane {
  type: 'CREATE_SPACE';
}

export interface EmptyPane {
  type: 'EMPTY';
}

export interface ProfilePane {
  type: 'PROFILE';
  userId: string;
}

export type PaneData =
  | SpacePane
  | ChannelPane
  | EmptyPane
  | SettingsPane
  | HelpPane
  | WelcomePane
  | SpaceSettingsPane
  | ChannelSettingsPane
  | CreateChannelPane
  | CreateSpacePane
  | LoginPane
  | ProfilePane
  | SpaceMembersPane;

export type Pane = PaneData & { key: number };

interface RootRoute {
  type: 'ROOT';
}

interface SpaceRoute {
  type: 'SPACE';
  spaceId: string;
}

interface NotFoundRoute {
  type: 'NOT_FOUND';
}

export type Route = RootRoute | SpaceRoute | NotFoundRoute;

export type NewPanePosition = 'HEAD' | 'TAIL' | { refKey: number; before?: boolean };

export const insertPaneByPosition = (panes: Pane[], pane: Pane, position: NewPanePosition): Pane[] => {
  const nextPanes = [...panes];
  if (position === 'HEAD') {
    nextPanes.unshift(pane);
    return nextPanes;
  } else if (position === 'TAIL') {
    nextPanes.push(pane);
    return nextPanes;
  }

  const { refKey, before } = position;
  const refIndex = nextPanes.findIndex((pane) => pane.key === refKey);
  if (refIndex !== -1) {
    nextPanes.splice(before ? refIndex : refIndex + 1, 0, pane);
    return nextPanes;
  }
  nextPanes.push(pane);
  return nextPanes;
};
