import type { Id } from 'utils';

export interface IdQuery {
  id: Id;
}

export interface IdWithToken {
  id: Id;
  token?: string;
}
