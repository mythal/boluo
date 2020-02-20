import React from 'react';
import { Link } from 'react-router-dom';

interface Props {}

export const ChannelGuestUserZone: React.FC<Props> = () => {
  return (
    <div>
      <Link to="/login">登录</Link> <Link to="/sign_up">注册</Link>
    </div>
  );
};
