import { type Message, type Preview } from '@boluo/api';
import { ComposeState } from './compose.reducer';
import { UploadError } from '../media';

export type PreviewItem = Preview & {
  type: 'PREVIEW';
  posP: number;
  posQ: number;
  optimistic?: true;
  failTo?: FailTo;
  key: string;
  timestamp: number;
};

export type FailTo =
  | { type: 'SEND'; onUpload?: UploadError }
  | { type: 'EDIT'; onUpload?: UploadError }
  | { type: 'DELETE' }
  | { type: 'UPLOAD' }
  | { type: 'MOVE' };

export type MessageItem = Message & {
  type: 'MESSAGE';
  optimistic?: true;
  optimisticMedia?: File | null;
  failTo?: FailTo;
  key: string;
};

export type ChatItem = PreviewItem | MessageItem;
