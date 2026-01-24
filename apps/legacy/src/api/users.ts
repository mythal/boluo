import type {
  CheckEmailExists,
  CheckUsernameExists,
  EditUser,
  GetMe,
  Login,
  LoginReturn,
  Register,
  ResetPassword,
  ResetPasswordConfirm,
  ResetPasswordTokenCheck,
  Settings,
  User,
} from '@boluo/api';

export type CheckEmail = CheckEmailExists;
export type CheckUsername = CheckUsernameExists;
export type LoginData = Login;
export type LoginResult = LoginReturn;
export type RegisterData = Register;
export type {
  EditUser,
  GetMe,
  ResetPassword,
  ResetPasswordConfirm,
  ResetPasswordTokenCheck,
  Settings,
  User,
};
