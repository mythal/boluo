import { type Message, type Preview } from '@boluo/api';
import { ComposeState } from './compose.reducer';
import { type UploadError } from '../media';

export type PreviewKeyframe = {
  id: string;
  version: number;
  name: string;
  text: string | null;
  entities: Preview['entities'];
};

export type PreviewItem = Preview & {
  type: 'PREVIEW';
  posP: number;
  posQ: number;
  optimistic?: true;
  failTo?: FailTo;
  key: string;
  timestamp: number;
  keyframe?: PreviewKeyframe;
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
