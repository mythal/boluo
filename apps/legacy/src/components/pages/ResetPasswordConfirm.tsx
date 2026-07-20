import { useCallback, useState } from 'react';
import { type RegisterOptions, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { errorText, NOT_FOUND } from '../../api/error';
import { post } from '../../api/request';
import { useTitle } from '../../hooks/useTitle';
import { alignRight, largeInput, mT, mY, textLg } from '../../styles/atoms';
import { passwordValidation } from '../../validators';
import Button from '../atoms/Button';
import { ErrorMessage } from '../atoms/ErrorMessage';
import Input from '../atoms/Input';
import { Label } from '../atoms/Label';
import Title from '../atoms/Title';

interface FormData {
  password: string;
  passwordRepeat: string;
}

function ResetPasswordConfirm() {
  useTitle('重设密码');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();
  const [state, setState] = useState<'loading' | 'default'>('default');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { token } = useParams();
  const navigate = useNavigate();

  const onSubmit = useCallback(
    async ({ password }: FormData) => {
      if (!token) {
        return;
      }
      setState('loading');
      setSubmitError(null);
      const result = await post('/users/reset_password_confirm', {
        password,
        token,
      });
      if (result.isErr) {
        setState('default');
        if (result.value.code === NOT_FOUND) {
          setSubmitError('重置链接无效或已过期，请重新申请');
        } else {
          const { description, detail } = errorText(result.value);
          setSubmitError(detail ? `${description}：${detail}` : description);
        }
        return;
      }
      navigate('/login');
    },
    [navigate, token],
  );

  const passwordRepeatValidation = {
    ...passwordValidation,
    validate: (value: string) => value === watch('password') || '两次输入的密码不相同',
  } satisfies RegisterOptions;
  return (
    <>
      <Title>重设密码</Title>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div css={[mY(2)]}>
          <Label htmlFor="password">密码</Label>
          <div>
            <Input
              css={largeInput}
              type="password"
              id="password"
              {...register('password', passwordValidation)}
            />
          </div>
          <div>{errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}</div>

          <div css={[mY(2)]}>
            <Label htmlFor="passwordRepeat">重复密码</Label>
            <div>
              <Input
                css={largeInput}
                type="password"
                id="password"
                {...register('passwordRepeat', passwordRepeatValidation)}
              />
            </div>
            <div>
              {errors.passwordRepeat && (
                <ErrorMessage>{errors.passwordRepeat.message}</ErrorMessage>
              )}
            </div>
          </div>
          <div css={[alignRight]}>
            {submitError && <ErrorMessage>{submitError}</ErrorMessage>}
            <Button
              css={[textLg, mT(2)]}
              disabled={state === 'loading'}
              data-variant="primary"
              type="submit"
            >
              重设密码
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}

export default ResetPasswordConfirm;
