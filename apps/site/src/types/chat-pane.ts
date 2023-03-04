import { makeId } from 'utils';

export interface ChannelPane {
  type: 'CHANNEL';
  channelId: string;
}

export interface SettingsPane {
  type: 'SETTINGS';
}

export interface HelpPane {
  type: 'HELP';
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

export type PaneData = ChannelPane | EmptyPane | SettingsPane | HelpPane | SpaceSettingsPane | CreateChannelPane;

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
    case 'CREATE_CHANNEL':
      return paneData.spaceId === (pane as CreateChannelPane).spaceId;
    default:
      return true;
  }
};

export const makePane = (paneData: PaneData): Pane => {
  const { type } = paneData;
  switch (paneData.type) {
    case 'HELP':
      return { ...paneData, id: type };
    case 'SETTINGS':
      return { ...paneData, id: type };
    case 'CREATE_CHANNEL':
      return { ...paneData, id: type };
    case 'SPACE_SETTINGS':
      return { ...paneData, id: type };
    default:
      return { ...paneData, id: makeId() };
  }
};
