import React, { useRef, useState } from 'react';
import { User } from '../api/users';
import { SignOutIcon, UserIcon } from './icons';
import { useOutside } from '../hooks';
import { cls } from '../classname';
import { get } from '../api/request';
import { clearCsrfToken } from '../api/csrf';
import { LoggedOut } from '../states/actions';
import { useDispatch } from './App';

interface Props {
  profile: User;
}

export const UserMenu = React.memo<Props>(({ profile }) => {
  const dispatch = useDispatch();
  const ref = useRef<HTMLUListElement | null>(null);
  const [open, setOpen] = useState(false);
  const dismiss = () => setOpen(false);

  const handleLogout = async () => {
    await get('/users/logout');
    clearCsrfToken();
    dispatch<LoggedOut>({ type: 'LOGGED_OUT' });
  };

  useOutside(ref, dismiss);

  return (
    <div className="inline-block relative">
      <button onClick={() => setOpen(!open)} className={cls('btn', { 'btn-down': open })}>
        <UserIcon />
      </button>
      <ul hidden={!open} className="menu absolute z-10 text-sm" ref={ref}>
        <li className="menu-item menu-item-static">{profile.nickname}</li>
        <li className="flex justify-between items-center menu-item" onClick={handleLogout}>
          登出
          <SignOutIcon />
        </li>
      </ul>
    </div>
  );
});
