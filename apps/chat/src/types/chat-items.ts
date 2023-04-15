import { Message, Preview } from 'api';

export type PreviewItem = Preview & { type: 'PREVIEW'; key: string };

export type MessageItem = Message & { type: 'MESSAGE'; key: string };

export type ChatItem = PreviewItem | MessageItem;

export function byPos(a: { pos: number }, b: { pos: number }): number {
  return a.pos - b.pos;
}
