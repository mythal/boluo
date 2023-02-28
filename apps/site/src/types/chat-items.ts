import { Message, Preview } from 'api';

export type PreviewItem = Preview & { type: 'PREVIEW' };

export type MessageItem = Message & { type: 'MESSAGE' };

export type ChatItem = PreviewItem | MessageItem;

export function posCompare(a: { pos: number }, b: { pos: number }): number {
  return a.pos - b.pos;
}
