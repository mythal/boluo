import React, { useState } from 'react';
import { useDispatch, useMe } from '../App/App';
import { Redirect, useHistory } from 'react-router-dom';
import { useNext } from '../hooks';
import { GUEST } from '../App/states';
import { checkDisplayName, checkEmailFormat, checkName, checkPassword, ValidatorResult } from '../validators';
import { InputField } from '../From/InputField';
import { post } from '../api/request';
import { CONFLICT, errorText, VALIDATION_FAIL } from '../api/error';
import { ERROR, SHOW_INFORMATION, ShowInformation } from '../App/actions';

const generateHandler = (
  setValue: (value: string) => void,
  setError: (message: string) => void,
  checker: (value: string) => ValidatorResult
) => (value: string) => {
  setValue(value);
  if (value.length === 0) {
    setError('');
    return;
  }
  const checked = checker(value);
  setError(checked.err() ?? '');
};

export const SignUpForm: React.FC = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const next = useNext();
  const me = useMe();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const passwordRepeatError = password === passwordRepeat ? '' : '两次输入的密码不相同';

  if (me !== GUEST) {
    return <Redirect to={next} />;
  }

  const usernameHandler = generateHandler(setUsername, setUsernameError, checkName);
  const emailHandler = generateHandler(setEmail, setEmailError, checkEmailFormat);
  const nicknameHandler = generateHandler(setNickname, setNicknameError, checkDisplayName);
  const passwordHandler = generateHandler(setPassword, setPasswordError, checkPassword);

  const someEmpty = [username, password, email, nickname, passwordRepeat].some(e => e.length === 0);
  const someError = [usernameError, emailError, nicknameError, passwordError, passwordRepeatError].some(
    e => e.length > 0
  );
  const isDisabled = someError || someEmpty;

  const handleSubmit: React.FormEventHandler = async e => {
    e.preventDefault();
    if (isDisabled) {
      return;
    }
    const registerResult = await post('/users/register', { email, username, password, nickname });
    if (registerResult.isOk) {
      history.push('/login');
    } else {
      const err = registerResult.value;
      let message: string;
      if (err.code === CONFLICT) {
        message = '已经存在这个用户名或者邮箱，也许您注册过了？';
      } else if (err.code === VALIDATION_FAIL) {
        message = err.message;
      } else {
        message = errorText(err);
      }
      dispatch<ShowInformation>({
        tag: SHOW_INFORMATION,
        level: ERROR,
        message,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <InputField value={username} onChange={usernameHandler} label="用户名" error={usernameError} />
      <InputField value={nickname} onChange={nicknameHandler} label="昵称" error={nicknameError} />
      <InputField value={email} onChange={emailHandler} label="邮箱" error={emailError} />
      <InputField value={password} onChange={passwordHandler} label="密码" error={passwordError} type="password" />
      <InputField
        value={passwordRepeat}
        onChange={setPasswordRepeat}
        label="重复密码"
        error={passwordRepeatError}
        type="password"
      />
      <div className="text-center">
        <button className="w-20 m-5 px-4 py-2 btn" type="submit" disabled={isDisabled}>
          注册
        </button>
      </div>
    </form>
  );
};
