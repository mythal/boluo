export interface LoginData {
  username: string;
  password: string;
  withToken?: boolean;
}

export interface SpaceIdWithToken {
  spaceId: string;
  token?: string;
}
export interface IdQuery {
  id: string;
}

export interface IdWithToken {
  id: string;
  token?: string;
}
