import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { type LoggedIn } from '../../actions';
import { type AppError, NO_PERMISSION } from '../../api/error';
import { get, post } from '../../api/request';
import { type LoginData } from '../../api/users';
import SignIn from '../../assets/icons/sign-in.svg';
import Icon from '../../components/atoms/Icon';
import { useTitle } from '../../hooks/useTitle';
import { useDispatch } from '../../store';
import { setAuthToken } from '../../utils/token';
import {
  alignRight,
  flex,
  flex1,
  largeInput,
  link,
  mR,
  mT,
  mY,
  sm,
  textLg,
} from '../../styles/atoms';
import { popNext } from '../../utils/browser';
import Button from '../atoms/Button';
import { ErrorMessage } from '../atoms/ErrorMessage';
import Input from '../atoms/Input';
import { Label } from '../atoms/Label';
import Title from '../atoms/Title';
import { RenderError } from '../molecules/RenderError';

const required = '必须填写这个字段';

const errorRewrite = {
  [NO_PERMISSION]: '用户名或密码错误',
};

function Login() {
  useTitle('登录');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<AppError | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>();
  const [loggingIn, setLoggingIn] = useState(false);
  const onSubmit = async (data: LoginData) => {
    setLoggingIn(true);
    const loginData = { ...data, withToken: true };
    const result = await post('/users/login', loginData);
    setLoggingIn(false);
    if (result.isOk) {
      if (result.value.token) {
        setAuthToken(result.value.token);
      }

      // Double check if the login is successful
      const querySelf = await get('/users/query', {});
      if (querySelf.isErr) {
        setLoginError(querySelf.value);
        return;
      } else if (querySelf.value == null) {
        alert('登录失败，请清理缓存或者更换浏览器重试');
        return;
      }
      dispatch<LoggedIn>({ type: 'LOGGED_IN', ...result.value.me });
      const next = popNext() || '/';
      navigate(next, { replace: true });
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
              autoComplete="username"
              {...register('username', { required })}
            />
            {errors.username && <ErrorMessage>{errors.username.message}</ErrorMessage>}
          </div>
          <div css={[mY(2), flex1]}>
            <Label htmlFor="password">密码</Label>
            <Input
              css={largeInput}
              type="password"
              id="password"
              autoComplete="current-password"
              {...register('password', { required })}
            />
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </div>
        </div>
        <div css={alignRight}>
          <Link to="/reset-password" css={[link, mR(2)]}>
            忘记密码？
          </Link>
          <Button css={[mT(4), textLg]} data-variant="primary" type="submit" disabled={loggingIn}>
            <Icon icon={SignIn} loading={loggingIn} />
            登录
          </Button>
        </div>
      </form>
    </>
  );
}

export default Login;
