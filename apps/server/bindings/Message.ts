// This file was generated by [ts-rs](https://github.com/Aleph-Alpha/ts-rs). Do not edit this file manually.

export interface Message {
  id: string;
  senderId: string;
  channelId: string;
  parentMessageId: string | null;
  name: string;
  mediaId: string | null;
  seed: Array<number>;
  inGame: boolean;
  isAction: boolean;
  isMaster: boolean;
  pinned: boolean;
  tags: Array<string>;
  folded: boolean;
  text: string;
  whisperToUsers: Array<string> | null;
  entities: unknown;
  created: string;
  modified: string;
  orderDate: string;
  orderOffset: number;
  pos: number;
}
