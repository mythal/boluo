export interface ChannelPane {
  type: 'CHANNEL';
  id: string;
  channelId: string;
}

export interface SettingsPane {
  type: 'SETTINGS';
  id: 'settings';
}

export interface HelpPane {
  type: 'HELP';
  id: 'help';
}

export interface SpaceSettingsPane {
  type: 'SPACE_SETTINGS';
  id: string;
  spaceId: string;
}

export interface CreateChannelPane {
  type: 'CREATE_CHANNEL';
  id: 'create_channel';
  spaceId: string;
}

export interface EmptyPane {
  type: 'EMPTY';
  id: string;
}

export type Pane = ChannelPane | EmptyPane | SettingsPane | HelpPane | SpaceSettingsPane | CreateChannelPane;
