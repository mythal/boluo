import type { Id } from 'boluo-utils';

export interface IdQuery {
  id: Id;
}

export interface IdWithToken {
  id: Id;
  token?: string;
}
