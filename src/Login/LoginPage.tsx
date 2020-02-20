import React from 'react';
import { LoginForm } from './LoginForm';
import { Link } from 'react-router-dom';

interface Props {}

export const LoginPage: React.FC<Props> = () => {
  return (
    <div>
      <div>登录</div>
      <LoginForm />

      <div className="no-account-yet">
        还没有菠萝菠萝账号？<Link to="/sign_up">点这里注册吧</Link>。
      </div>
    </div>
  );
};
