import React, { useState } from 'react';
import { Login } from '../Login';
import { Tooltip } from '../Tooltip';
import { LoginIcon } from '../icons';

interface Props {}

export const LoginButton = React.memo<Props>(() => {
  const [isOpen, setIsOpen] = useState(false);
  const open = () => setIsOpen(true);
  const dismiss = () => setIsOpen(false);

  return (
    <div className="p-1">
      {isOpen ? <Login dismiss={dismiss} /> : null}
      <Tooltip r b message={<div className="w-8 text-center">登录</div>}>
        <button onClick={open} className="btn-sized text-sm round">
          <LoginIcon />
        </button>
      </Tooltip>
    </div>
  );
});
