import { EntityUser } from './entities';

export interface MemberJoined {
  type: 'MemberJoined';
  user: EntityUser;
  operator: EntityUser;
}

export interface MemberLeft {
  type: 'MemberLeft';
  user: EntityUser;
}

export interface NewMaster {
  type: 'NewMaster';
  user: EntityUser;
}

export interface NewSubChannel {
  type: 'NewSubChannel';
  owner: EntityUser;
  name: string;
  id: string;
}

export type Metadata = MemberJoined | MemberLeft | NewSubChannel | NewMaster;
