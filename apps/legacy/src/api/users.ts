import { Id } from '../utils/id';
import { ChannelWithMember } from './channels';
import { SpaceWithMember } from './spaces';

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
}

export interface LoginResult {
  me: GetMe;
  token: null;
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
