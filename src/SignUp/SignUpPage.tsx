import React from 'react';
import { SignUpForm } from './SignUpForm';
import { Link } from 'react-router-dom';

interface Props {}

export const SignUpPage: React.FC<Props> = () => {
  return (
    <div className="login-and-sign-up-container">
      <h1 className="login-and-sign-up-title">新用户注册</h1>
      <SignUpForm />
      <p className="text-xs text-center">
        已经有账号了？<Link to="/login">登录</Link>。
      </p>
    </div>
  );
};
