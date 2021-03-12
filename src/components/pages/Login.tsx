import * as React from 'react';
import { useState } from 'react';
import Title from '../atoms/Title';
import Input from '../atoms/Input';
import { alignRight, flex, flex1, largeInput, mR, mT, mY, sm, textLg } from '../../styles/atoms';
import Button from '../atoms/Button';
import { useForm } from 'react-hook-form';
import { LoginData } from '../../api/users';
import { ErrorMessage } from '../atoms/ErrorMessage';
import { post } from '../../api/request';
import { AppError, NO_PERMISSION } from '../../api/error';
import { useHistory } from 'react-router-dom';
import { useDispatch } from '../../store';
import { LoggedIn } from '../../actions/profile';
import { Label } from '../atoms/Label';
import loginIcon from '../../assets/icons/sign-in.svg';
import Icon from '../../components/atoms/Icon';
import { RenderError } from '../molecules/RenderError';
import { useTitle } from '../../hooks/useTitle';
import { popNext } from '../../utils/browser';

const required = '必须填写这个字段';

const errorRewrite = {
  [NO_PERMISSION]: '用户名或密码错误',
};

function Login() {
  useTitle('登录');
  const dispatch = useDispatch();
  const history = useHistory();
  const [loginError, setLoginError] = useState<AppError | null>(null);
  const { register, handleSubmit, errors } = useForm<LoginData>();
  const [loggingIn, setLoggingIn] = useState(false);
  const onSubmit = async (data: LoginData) => {
    setLoggingIn(true);
    const result = await post('/users/login', data);
    setLoggingIn(false);
    if (result.isOk) {
      dispatch<LoggedIn>({ type: 'LOGGED_IN', ...result.value.me });
      const next = popNext() || '/';
      history.replace(next);
    } else {
      setLoginError(result.value);
    }
  };

  return (
    <>
      <Title>登录</Title>
      {loginError && <RenderError error={loginError} variant="component" rewrite={errorRewrite} />}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div css={[sm(flex)]}>
          <div css={[mY(2), sm(mR(2), flex1)]}>
            <Label htmlFor="username">用户名 / 邮箱</Label>
            <Input
              css={largeInput}
              id="username"
              name="username"
              autoComplete="username"
              ref={register({ required })}
            />
            {errors.username && <ErrorMessage>{errors.username.message}</ErrorMessage>}
          </div>
          <div css={[mY(2), flex1]}>
            <Label htmlFor="password">密码</Label>
            <Input
              css={largeInput}
              type="password"
              id="password"
              name="password"
              autoComplete="current-password"
              ref={register({ required })}
            />
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </div>
        </div>
        <div css={alignRight}>
          <Button css={[mT(4), textLg]} data-variant="primary" type="submit" disabled={loggingIn}>
            <Icon sprite={loginIcon} loading={loggingIn} />
            登录
          </Button>
        </div>
      </form>
    </>
  );
}

export default Login;
