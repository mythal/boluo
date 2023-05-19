import { Message, Preview } from 'api';

export type PreviewItem = Preview & {
  type: 'PREVIEW';
  posP: number;
  posQ: number;
  optimistic?: true;
  key: string;
  timestamp: number;
};

export type MessageItem = Message & { type: 'MESSAGE'; optimistic?: true; key: string };

export type ChatItem = PreviewItem | MessageItem;
