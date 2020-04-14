import React, { useState } from 'react';
import { Login } from './Login';

interface Props {}

export const Welcome: React.FC<Props> = () => {
  const [state, setState] = useState<'LOGIN' | 'SIGN_UP' | null>(null);
  let dialog = null;
  const dismiss = () => setState(null);
  if (state !== null) {
    dialog = <Login dismiss={dismiss} signUp={state === 'SIGN_UP'} />;
  }
  return (
    <div className="p-4">
      <h1 className="text-4xl font-serif">菠萝</h1>
      <p className="my-3">这是欢迎页面，还没来得及好好写</p>
      <button className="btn-large btn-primary mr-2" onClick={() => setState('SIGN_UP')}>
        注册
      </button>
      <button className="btn-large" onClick={() => setState('LOGIN')}>
        登录
      </button>
      {dialog}
    </div>
  );
};
