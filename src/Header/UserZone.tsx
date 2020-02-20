import React from 'react';
import { useMe } from '../App/App';
import { GUEST } from '../App/states';
import { Link } from 'react-router-dom';

interface Props {}

export const UserZone: React.FC<Props> = () => {
  const me = useMe();
  if (me === GUEST) {
    return (
      <div>
        <Link to="/login">登录</Link> <Link to="/sign_up">注册</Link>
      </div>
    );
  } else {
    return (
      <div>
        {me.nickname}
        <Link className="ml-1" to="/logout">
          登出
        </Link>
      </div>
    );
  }
};
