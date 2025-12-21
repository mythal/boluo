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

export interface SignUpPane {
  type: 'SIGN_UP';
}

export interface ResetPasswordPane {
  type: 'RESET_PASSWORD';
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

export interface SpaceGreetingPane {
  type: 'SPACE_GREETING';
  spaceId: string;
}

export interface ChannelExportPane {
  type: 'CHANNEL_EXPORT';
  channelId: string;
}

export interface ChannelSettingsPane {
  type: 'CHANNEL_SETTINGS';
  channelId: string;
}

export interface ChannelTopicPane {
  type: 'CHANNEL_TOPIC';
  channelId: string;
}

export interface CreateChannelPane {
  type: 'CREATE_CHANNEL';
  spaceId: string;
}

export interface CreateCharacterPane {
  type: 'CREATE_CHARACTER';
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
  | SpaceGreetingPane
  | ChannelSettingsPane
  | ChannelTopicPane
  | CreateChannelPane
  | CreateCharacterPane
  | CreateSpacePane
  | LoginPane
  | SignUpPane
  | ResetPasswordPane
  | ProfilePane
  | ChannelExportPane
  | SpaceMembersPane;

export type ChildPaneRatio = '1/2' | '2/3' | '1/3';

export interface PaneChild {
  ratio: ChildPaneRatio;
  pane: PaneData;
}

export type Pane = PaneData & { key: number; child?: PaneChild };

interface RootRoute {
  type: 'ROOT';
}

interface SpaceRoute {
  type: 'SPACE';
  spaceId: string;
}

interface InviteRoute {
  type: 'INVITE';
  spaceId: string;
  token: string;
}

interface NotFoundRoute {
  type: 'NOT_FOUND';
}

export type Route = RootRoute | SpaceRoute | NotFoundRoute | InviteRoute;

export type NewPanePosition = 'HEAD' | 'TAIL' | { refKey: number; before?: boolean };

export const insertPaneByPosition = (
  panes: Pane[],
  pane: Pane,
  position: NewPanePosition,
): Pane[] => {
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
