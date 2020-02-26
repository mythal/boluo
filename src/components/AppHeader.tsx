import React, { useState } from 'react';
import { useDispatch, useMy } from './App';
import { BarsIcon, LoginIcon } from './icons';
import { Login } from './Login';
import { cls } from '../classname';
import { UserMenu } from './UserMenu';
import { Tooltip } from './Tooltip';

export interface Props {
  sidebar: boolean;
}

export const AppHeader: React.FC<Props> = ({ sidebar }) => {
  const my = useMy();
  const dispatch = useDispatch();
  const [login, setLogin] = useState(false);

  const startLogin = () => setLogin(true);
  const dismissLogin = () => setLogin(false);

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  return (
    <div className="w-full p-2 h-12 bg-gray-100 border-b flex items-center">
      {login ? <Login dismiss={dismissLogin} /> : null}
      {my === 'GUEST' ? (
        <Tooltip message={<div className="w-8 text-center">登录</div>} bottom>
          <button onClick={startLogin} className="btn text-sm">
            <LoginIcon />
          </button>
        </Tooltip>
      ) : (
        <div>
          <button className={cls('btn', { 'btn-down': sidebar })} onClick={toggleSidebar}>
            <BarsIcon />
          </button>
          <UserMenu profile={my.profile} />
        </div>
      )}
    </div>
  );
};
