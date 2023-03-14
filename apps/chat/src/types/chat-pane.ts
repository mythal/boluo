import { makeId } from 'utils';

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

export interface CreateChannelPane {
  type: 'CREATE_CHANNEL';
  spaceId: string;
}

export interface EmptyPane {
  type: 'EMPTY';
}

export interface ProfilePane {
  type: 'PROFILE';
  userId: string;
}

export type PaneData =
  | ChannelPane
  | EmptyPane
  | SettingsPane
  | HelpPane
  | SpaceSettingsPane
  | CreateChannelPane
  | LoginPane
  | ProfilePane
  | SpaceMembersPane;

const UNIQUE_PANE_TYPES: Array<Pane['type']> = [
  'HELP',
  'CREATE_CHANNEL',
  'SETTINGS',
  'LOGIN',
  'SPACE_SETTINGS',
  'SPACE_MEMBERS',
];

export type Pane = PaneData & {
  id: string;
};

export function isPaneData(pane: unknown): pane is PaneData {
  if (typeof pane !== 'object' || pane === null) {
    return false;
  }
  if (!('type' in pane) || typeof pane.type !== 'string') {
    return false;
  }
  return true;
}

export const isSamePaneData = (paneData: PaneData, pane: Pane): boolean => {
  if (paneData.type !== pane.type) {
    return false;
  }
  switch (paneData.type) {
    case 'CHANNEL':
      return paneData.channelId === (pane as ChannelPane).channelId;
    case 'SPACE_SETTINGS':
      return paneData.spaceId === (pane as SpaceSettingsPane).spaceId;
    case 'SPACE_MEMBERS':
      return paneData.spaceId === (pane as SpaceMembersPane).spaceId;
    case 'CREATE_CHANNEL':
      return paneData.spaceId === (pane as CreateChannelPane).spaceId;
    default:
      return true;
  }
};

export const makePane = (paneData: PaneData): Pane => {
  const { type } = paneData;
  switch (type) {
    case 'PROFILE':
      return { ...paneData, id: paneData.userId };
    default:
      if (UNIQUE_PANE_TYPES.includes(type)) {
        return { ...paneData, id: type };
      } else {
        return { ...paneData, id: makeId() };
      }
  }
};
