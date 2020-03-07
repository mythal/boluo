import React, { useRef, useState } from 'react';
import { User } from '../../api/users';
import { SignOutIcon, UserIcon } from '../icons';
import { cls } from '../../classname';
import { get } from '../../api/request';
import { clearCsrfToken } from '../../api/csrf';
import { LoggedOut } from '../../states/actions';
import { useDispatch } from '../Provider';
import { Menu } from '../Menu';

interface Props {
  profile: User;
  className?: string;
}

export const UserMenu = React.memo<Props>(({ profile, className }) => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const menuHook = useRef<HTMLButtonElement | null>(null);
  const dismiss = () => {
    setOpen(false);
  };

  const handleLogout = async () => {
    await get('/users/logout');
    clearCsrfToken();
    dispatch<LoggedOut>({ type: 'LOGGED_OUT' });
  };

  return (
    <div className="inline-block relative">
      <button
        onClick={() => setOpen(!open)}
        className={cls('sidebar-btn', { 'sidebar-btn-down': open }, className)}
        ref={menuHook}
      >
        <UserIcon />
      </button>
      <Menu open={open} dismiss={dismiss} anchor={menuHook} t r>
        <li className="menu-item menu-item-static">{profile.nickname}</li>
        <li className="flex justify-between items-center menu-item" onClick={handleLogout}>
          登出
          <SignOutIcon />
        </li>
      </Menu>
    </div>
  );
});
