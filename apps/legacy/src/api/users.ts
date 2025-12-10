import { type Id } from '../utils/id';
import { type ChannelWithMember } from './channels';
import { type SpaceWithMember } from './spaces';

export interface User {
  id: Id;
  username: string;
  nickname: string;
  bio: string;
  joined: number;
  deactivated: boolean;
  avatarId: Id | null;
}

export interface GetMe {
  user: User;
  settings: Settings;
  mySpaces: SpaceWithMember[];
  myChannels: ChannelWithMember[];
}

export interface EditUser {
  nickname?: string;
  bio?: string;
}

export interface RegisterData {
  username: string;
  nickname: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
  withToken?: boolean;
}

export interface LoginResult {
  me: GetMe;
  token: string | null;
}

export interface CheckEmail {
  email: string;
}

export interface CheckUsername {
  username: string;
}

export interface Settings {
  enterSend?: boolean;
  expandDice?: boolean;
}

export interface ResetPassword {
  email: string;
}

export interface ResetPasswordConfirm {
  token: string;
  password: string;
}

export interface ResetPasswordTokenCheck {
  token: string;
}
