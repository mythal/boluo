import React from 'react';
import { SignUpForm } from './SignUpForm';
import { Link } from 'react-router-dom';

interface Props {}

export const SignUpPage: React.FC<Props> = () => {
  return (
    <div>
      <div>新用户注册</div>
      <SignUpForm />
      <p className="had-account">
        已经有账号了？<Link to="/login">登录</Link>。
      </p>
    </div>
  );
};
