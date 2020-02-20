import React from 'react';
import { LoginForm } from './LoginForm';
import { Link } from 'react-router-dom';

interface Props {}

export const LoginPage: React.FC<Props> = () => {
  return (
    <div className="login-and-sign-up-container">
      <h1 className="login-and-sign-up-title">登录</h1>
      <LoginForm />

      <div className="text-xs text-center">
        还没有菠萝菠萝账号？<Link to="/sign_up">点这里注册吧</Link>。
      </div>
    </div>
  );
};
