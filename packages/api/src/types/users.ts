import type { CheckEmailExists as CheckEmail } from '@boluo/server-bindings/CheckEmailExists';
import type { CheckUsernameExists as CheckUsername } from '@boluo/server-bindings/CheckUsernameExists';
import type { EditUser } from '@boluo/server-bindings/EditUser';
import type { GetMe } from '@boluo/server-bindings/GetMe';
import type { LoginReturn } from '@boluo/server-bindings/LoginReturn';
import type { Register as RegisterData } from '@boluo/server-bindings/Register';
import type { ResetPassword } from '@boluo/server-bindings/ResetPassword';
import type { ResetPasswordConfirm } from '@boluo/server-bindings/ResetPasswordConfirm';
import type { ResetPasswordTokenCheck } from '@boluo/server-bindings/ResetPasswordTokenCheck';
import type { User } from '@boluo/server-bindings/User';

export interface LoginData {
  username: string;
  password: string;
  withToken?: boolean;
}

export interface Settings {
  enterSend?: boolean;
  expandDice?: boolean;
}

export {
  CheckEmail,
  CheckUsername,
  EditUser,
  GetMe,
  LoginReturn,
  RegisterData,
  ResetPassword,
  ResetPasswordConfirm,
  ResetPasswordTokenCheck,
  User,
};
