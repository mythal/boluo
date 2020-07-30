import * as React from 'react';
import { useState } from 'react';
import Title from '../atoms/Title';
import { useTitle } from '@/hooks';
import Input from '../atoms/Input';
import { alignRight, flex, flex1, largeInput, mR, mT, mY, sm, textLg } from '@/styles/atoms';
import Button from '../atoms/Button';
import { useForm } from 'react-hook-form';
import { LoginData } from '@/api/users';
import { ErrorMessage } from '../atoms/ErrorMessage';
import { post } from '@/api/request';
import { AppError, errorText, NO_PERMISSION } from '@/api/error';
import InformationBar from '../molecules/InformationBar';
import { useLocation, useHistory } from 'react-router-dom';
import { useDispatch } from '@/store';
import { LoggedIn } from '@/actions/profile';
import { Label } from '../atoms/Label';
import { clearCsrfToken } from '@/api/csrf';

interface State {
  next?: string;
}

const required = '必须填写这个字段';

function loginErrorText(e: AppError) {
  if (e.code === NO_PERMISSION) {
    return '用户名或密码错误';
  }
  return errorText(e);
}

function Login() {
  useTitle('登录');
  const dispatch = useDispatch();
  const location = useLocation<State | null>();
  const history = useHistory();
  const next = (location.state && location.state.next) || '/';
  const [loginError, setLoginError] = useState<AppError | null>(null);
  const { register, handleSubmit, errors } = useForm<LoginData>();
  const onSubmit = async (data: LoginData) => {
    const result = await post('/users/login', data);
    clearCsrfToken();
    if (result.isOk) {
      dispatch<LoggedIn>({ type: 'LOGGED_IN', ...result.value.me });
      history.replace(next);
    } else {
      setLoginError(result.value);
    }
  };

  return (
    <>
      <Title>登录</Title>
      {loginError && <InformationBar variant="ERROR">{loginErrorText(loginError)}</InformationBar>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div css={[sm(flex)]}>
          <div css={[mY(2), sm(mR(2), flex1)]}>
            <Label htmlFor="username">用户名 / 邮箱</Label>
            <Input css={largeInput} id="username" name="username" ref={register({ required })} />
            {errors.username && <ErrorMessage>{errors.username.message}</ErrorMessage>}
          </div>
          <div css={[mY(2), flex1]}>
            <Label htmlFor="password">密码</Label>
            <Input css={largeInput} type="password" id="password" name="password" ref={register({ required })} />
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </div>
        </div>
        <div css={alignRight}>
          <Button css={[mT(4), textLg]} data-variant="primary" type="submit">
            登录
          </Button>
        </div>
      </form>
    </>
  );
}

export default Login;
