export interface OpenChannel {
  type: 'OPEN_CHANNEL';
  name: string;
  title: string;
  id: string;
}

export interface ClosePane {
  type: 'CLOSE_PANE';
  id: string;
}

export type AppAction = OpenChannel | ClosePane;
