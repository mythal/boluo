import { type Message, type Preview } from '@boluo/api';

export type PreviewItem = Preview & {
  type: 'PREVIEW';
  posP: number;
  posQ: number;
  optimistic?: true;
  key: string;
  timestamp: number;
};

export type FailTo = { type: 'SEND' } | { type: 'EDIT' } | { type: 'DELETE' } | { type: 'UPLOAD' };
export type MessageItem = Message & {
  type: 'MESSAGE';
  optimistic?: true;
  optimisticMedia?: File | null;
  failTo?: FailTo;
  key: string;
};

export type ChatItem = PreviewItem | MessageItem;
