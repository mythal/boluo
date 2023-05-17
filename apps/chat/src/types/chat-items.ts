import { Message, Preview } from 'api';

export type PreviewItem = Preview & { type: 'PREVIEW'; posP: number; posQ: number };

export type MessageItem = Message & { type: 'MESSAGE'; optimistic?: true };

export type ChatItem = PreviewItem | MessageItem;
