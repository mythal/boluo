import React, { useState } from 'react';
import { Dialog } from './Dialog';
import { Input } from './Input';
import { useDispatch, useProfile } from './Provider';
import { checkDisplayName, checkEmail, checkPassword, checkUsername } from '../validators';
import { post } from '../api/request';
import { clearCsrfToken, getCsrfToken } from '../api/csrf';
import { InformationItem } from './InformationItem';
import { CONFLICT, errorText, NO_PERMISSION } from '../api/error';

interface Props {
  dismiss: () => void;
  signUp?: boolean;
}

const IfYou: React.FC<{ signingUp: boolean; toggle: () => void }> = ({ signingUp, toggle }) => {
  return signingUp ? (
    <p className="p-1 text-xs">
      如果已经有账号了，请
      <button onClick={toggle} className="btn-sized m-1 px-1 rounded">
        登录
      </button>
      吧。
    </p>
  ) : (
    <p className="p-1 text-xs">
      如果还没有账号，请
      <button onClick={toggle} className="btn-sized m-1 px-1 rounded">
        注册
      </button>
      吧。
    </p>
  );
};

export const Login: React.FC<Props> = ({ dismiss, signUp }) => {
  const profile = useProfile();
  const dispatch = useDispatch();
  const [signingUp, setSigningUp] = useState(Boolean(signUp));
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (profile === undefined) {
    return null;
  }
  const usernameError = username.length === 0 ? null : checkUsername(username).err();
  const nicknameError = nickname.length === 0 ? null : checkDisplayName(nickname).err();
  const passwordError = password.length === 0 ? null : checkPassword(password).err();
  const emailError = email.length === 0 ? null : checkEmail(email).err();
  const passwordRepeatError = password === passwordRepeat ? null : '两次密码输入不匹配。';

  let canSubmit = usernameError === null && username.length > 0 && passwordError === null && password.length > 0;
  if (signingUp) {
    canSubmit =
      canSubmit &&
      emailError === null &&
      email.length > 0 &&
      passwordRepeatError === null &&
      nickname.length > 0 &&
      nicknameError === null;
  }

  const handleSubmit: React.FormEventHandler = async (e) => {
    e.preventDefault();
    if (canSubmit) {
      setPassword('');
      setPasswordRepeat('');
      setError(null);
      if (signingUp) {
        const result = await post('/users/register', { email, username, password, nickname });
        if (result.isOk) {
          setSigningUp(false);
          return;
        }
        const err = result.value;
        if (err.code === CONFLICT) {
          setError('已经存在这个用户名或者邮箱，也许您注册过了？');
        } else {
          setError(errorText(err));
        }
      } else {
        const result = await post('/users/login', { username, password });
        if (result.isErr) {
          const message =
            result.value.code === NO_PERMISSION ? '登录失败，请检查您的用户名和密码' : errorText(result.value);
          setError(message);
          return;
        }
        const { user, mySpaces, myChannels } = result.value.me;
        clearCsrfToken();
        await getCsrfToken();
        dispatch({ type: 'LOGGED_IN', user, mySpaces, myChannels });
      }
    }
  };

  return (
    <Dialog dismiss={dismiss}>
      <form className="dialog" onSubmit={handleSubmit}>
        {error === null ? null : <InformationItem level="ERROR" content={error} />}
        <div>
          <Input label="用户名" value={username} onChange={setUsername} error={usernameError} />
        </div>
        <div hidden={!signingUp}>
          <Input label="昵称" value={nickname} onChange={setNickname} error={nicknameError} />
        </div>
        <div hidden={!signingUp}>
          <Input label="邮箱" value={email} onChange={setEmail} error={emailError} />
        </div>
        <div>
          <Input label="密码" type="password" value={password} onChange={setPassword} error={passwordError} />
        </div>
        <div hidden={!signingUp}>
          <Input
            label="重复密码"
            type="password"
            value={passwordRepeat}
            onChange={setPasswordRepeat}
            error={passwordRepeatError}
          />
        </div>
        <div className="my-3 text-right">
          <button className="btn-sized mr-1" type="button" onClick={dismiss}>
            取消
          </button>
          <button type="submit" disabled={!canSubmit} className="btn-sized btn-primary">
            {signingUp ? '注册' : '登录'}
          </button>
        </div>
        <IfYou signingUp={signingUp} toggle={() => setSigningUp(!signingUp)} />
      </form>
    </Dialog>
  );
};
