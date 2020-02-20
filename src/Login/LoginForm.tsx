import React, { useState } from 'react';
import { useDispatch, useMe } from '../App/App';
import { Redirect } from 'react-router-dom';
import { GUEST } from '../App/states';
import { post } from '../api/request';
import { Action, ERROR, LOGGED_IN, SHOW_INFORMATION } from '../App/actions';
import { errorText, NO_PERMISSION } from '../api/error';
import { useNext } from '../hooks';
import { InputField } from '../From/InputField';
import { clearCsrfToken, getCsrfToken } from '../api/csrf';

interface Props {}

export const LoginForm: React.FC<Props> = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const dispatch = useDispatch();
  const next = useNext();

  const me = useMe();
  if (me !== GUEST) {
    return <Redirect to={next} />;
  }
  const onUsernameChange = (value: string) => setUsername(value || '');
  const onPasswordChange = (value: string) => setPassword(value || '');
  const isDisabled = [username, password].some(s => s.length === 0);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isDisabled) {
      return;
    }
    const loginResult = await post('/users/login', { username, password });

    const action = loginResult
      .map(
        ({ me }): Action => {
          const { user, mySpaces, myChannels } = me;
          clearCsrfToken();
          getCsrfToken();
          return { tag: LOGGED_IN, user, mySpaces, myChannels };
        }
      )
      .unwrapOrElse(
        (err): Action => {
          const message = err.code === NO_PERMISSION ? '登录失败，请检查您的用户名和密码' : errorText(err);
          return { tag: SHOW_INFORMATION, level: ERROR, message };
        }
      );
    dispatch(action);
  };

  return (
    <form onSubmit={onSubmit}>
      <InputField value={username} onChange={onUsernameChange} label="用户名" />
      <InputField value={password} onChange={onPasswordChange} label="密码" type="password" />
      <div>
        <button type="submit" disabled={isDisabled}>
          登录
        </button>
      </div>
    </form>
  );
};
