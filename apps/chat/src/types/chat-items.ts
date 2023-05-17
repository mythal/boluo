import { Message, Preview } from 'api';

export type PreviewItem = Preview & { type: 'PREVIEW'; key: string; posP: number; posQ: number };

export type MessageItem = Message & { type: 'MESSAGE'; key: string; optimistic?: true };

export type ChatItem = PreviewItem | MessageItem;
