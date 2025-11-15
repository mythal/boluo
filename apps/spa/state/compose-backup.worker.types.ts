export interface ComposeDraftEntry {
  id: string;
  channelId: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export type ComposeBackupWorkerRequest =
  | { type: 'save'; channelId: string; text: string }
  | { type: 'list'; channelId: string; requestId: number };

export type ComposeBackupWorkerResponse =
  | { type: 'updated'; channelId: string }
  | { type: 'listResult'; channelId: string; requestId: number; drafts: ComposeDraftEntry[] };
