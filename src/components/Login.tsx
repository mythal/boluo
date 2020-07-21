import * as React from 'react';
import { useState } from 'react';
import BasePage from './templates/BasePage';
import Title from './atoms/Title';
import { useTitle } from '../hooks';
import Input from './atoms/Input';
import { alignRight, block, flex, flex1, largeInput, mR, mT, mY, pY, sm, textLg } from '../styles/atoms';
import { css } from '@emotion/core';
import Button from './atoms/Button';
import { useForm } from 'react-hook-form';
import { LoginData } from '../api/users';
import { ErrorMessage } from './atoms/ErrorMessage';
import { post } from '../api/request';
import { AppError, errorText, NO_PERMISSION } from '../api/error';
import InformationBar from './molecules/InformationBar';
import { useLocation } from 'react-router-dom';

interface State {
  next?: string;
}

const labelStyle = css`
  ${pY(2)};
  ${block}
`;

const required = '必须填写这个字段';

function loginErrorText(e: AppError) {
  if (e.code === NO_PERMISSION) {
    return '用户名或密码错误';
  }
  return errorText(e);
}

function Login() {
  useTitle('登录');
  const location = useLocation<State>();
  const [loginError, setLoginError] = useState<AppError | null>(null);
  const { register, handleSubmit, errors } = useForm<LoginData>();
  const onSubmit = async (data: LoginData) => {
    const result = await post('/users/login', data);
    if (result.isOk) {
      window.location.replace(location.state.next || '/');
    } else {
      setLoginError(result.value);
    }
  };

  return (
    <BasePage>
      <Title>登录</Title>
      {loginError && <InformationBar variant="ERROR">{loginErrorText(loginError)}</InformationBar>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div css={[sm(flex)]}>
          <div css={[mY(2), sm(mR(2), flex1)]}>
            <label css={labelStyle} htmlFor="username">
              用户名 / 邮箱
            </label>
            <Input css={largeInput} id="username" name="username" ref={register({ required })} />
            {errors.username && <ErrorMessage>{errors.username.message}</ErrorMessage>}
          </div>
          <div css={[mY(2), flex1]}>
            <label css={labelStyle} htmlFor="password">
              密码
            </label>
            <Input css={largeInput} type="password" id="password" name="password" ref={register({ required })} />
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </div>
        </div>
        <div css={alignRight}>
          <Button css={[mT(4), textLg]} data-variant="primary">
            登录
          </Button>
        </div>
      </form>
    </BasePage>
  );
}

export default Login;
