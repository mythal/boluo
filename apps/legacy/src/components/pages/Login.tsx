import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { type LoggedIn } from '../../actions';
import { type AppError, NO_PERMISSION } from '../../api/error';
import { get, post } from '../../api/request';
import { type LoginData, type Settings } from '../../api/users';
import { useSWRConfig } from 'swr';
import SignIn from '@boluo/icons/legacy/SignIn';
import Icon from '../../components/atoms/Icon';
import { clearProfileQueryCache } from '../../hooks/profileCache';
import { useTitle } from '../../hooks/useTitle';
import { useDispatch } from '../../store';
import { setAuthToken } from '../../utils/token';
import { popNext } from '../../utils/browser';
import Button from '../atoms/Button';
import { ErrorMessage } from '../atoms/ErrorMessage';
import { linkClassName } from '../atoms/ExternalLink';
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
  const { mutate } = useSWRConfig();
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
      await clearProfileQueryCache(mutate);

      // Double check if the login is successful
      const querySelf = await get('/users/query', { id: null });
      if (querySelf.isErr) {
        setLoginError(querySelf.value);
        return;
      } else if (querySelf.value == null) {
        alert('登录失败，请清理缓存或者更换浏览器重试');
        return;
      }
      const me = result.value.me;
      const settings = (me.settings ?? {}) as Settings;
      dispatch<LoggedIn>({
        type: 'LOGGED_IN',
        user: me.user,
        settings,
        myChannels: me.myChannels,
        mySpaces: me.mySpaces,
      });
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
        <div className="sm:flex">
          <div className="my-2 flex-1 sm:mr-2">
            <Label htmlFor="username">用户名 / 邮箱</Label>
            <Input
              className="h-10"
              id="username"
              inputSize="large"
              autoComplete="username"
              {...register('username', { required })}
            />
            {errors.username && <ErrorMessage>{errors.username.message}</ErrorMessage>}
          </div>
          <div className="my-2 flex-1">
            <Label htmlFor="password">密码</Label>
            <Input
              className="h-10"
              type="password"
              id="password"
              inputSize="large"
              autoComplete="current-password"
              {...register('password', { required })}
            />
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </div>
        </div>
        <div className="pt-4 text-right">
          <Link className={`${linkClassName} mr-2`} to="/reset-password">
            忘记密码？
          </Link>
          <Button size="large" variant="primary" type="submit" disabled={loggingIn}>
            <Icon icon={SignIn} loading={loggingIn} />
            登录
          </Button>
        </div>
      </form>
    </>
  );
}

export default Login;
