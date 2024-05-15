import { Message, Preview } from '@boluo/api';

export type PreviewItem = Preview & {
  type: 'PREVIEW';
  posP: number;
  posQ: number;
  optimistic?: true;
  key: string;
  timestamp: number;
};

export type MessageItem = Message & { type: 'MESSAGE'; optimistic?: true; sending?: boolean; key: string };

export type ChatItem = PreviewItem | MessageItem;
