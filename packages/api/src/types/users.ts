import type { CheckEmailExists as CheckEmail } from '@boluo/server-bindings/CheckEmailExists.js';
import type { CheckUsernameExists as CheckUsername } from '@boluo/server-bindings/CheckUsernameExists.js';
import type { EditUser } from '@boluo/server-bindings/EditUser.js';
import type { GetMe } from '@boluo/server-bindings/GetMe.js';
import type { LoginReturn } from '@boluo/server-bindings/LoginReturn.js';
import type { Register as RegisterData } from '@boluo/server-bindings/Register.js';
import type { ResetPassword } from '@boluo/server-bindings/ResetPassword.js';
import type { ResetPasswordConfirm } from '@boluo/server-bindings/ResetPasswordConfirm.js';
import type { ResetPasswordTokenCheck } from '@boluo/server-bindings/ResetPasswordTokenCheck.js';
import type { User } from '@boluo/server-bindings/User.js';

export interface LoginData {
  username: string;
  password: string;
  withToken?: boolean;
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
