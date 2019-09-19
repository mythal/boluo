export enum ActionType {
  OpenChannel,
  ClosePane,
}

export interface OpenChannel {
  type: ActionType.OpenChannel;
  name: string;
  title: string;
  id: string;
}

export interface ClosePane {
  type: ActionType.ClosePane;
  id: string;
}

export type AppAction = OpenChannel | ClosePane;
