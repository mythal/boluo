import * as React from 'react';
import { useTitle } from '../../hooks/useTitle';
import Title from '../atoms/Title';
import { mY, largeInput, textLg, mT, alignRight } from '../../styles/atoms';
import { Label } from '../atoms/Label';
import Input from '../atoms/Input';
import Button from '../atoms/Button';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { passwordValidation } from '../../validators';
import { post } from '../../api/request';
import { useHistory, useParams } from 'react-router-dom';
import { RegisterOptions as ValidationRules } from 'react-hook-form/dist/types/validator';
import { ErrorMessage } from '../atoms/ErrorMessage';

interface FormData {
  password: string;
  passwordRepeat: string;
}

interface UrlParams {
  token: string;
}

function ResetPasswordConfirm() {
  useTitle('重设密码');
  const { register, handleSubmit, watch, errors } = useForm<FormData>();
  const [state, setState] = useState<'loading' | 'default'>('default');
  const { token } = useParams<UrlParams>();
  const history = useHistory();

  const onSubmit = useCallback(
    async ({ password }: FormData) => {
      setState('loading');
      await post('/users/reset_password_confirm', { password, token });
      history.push('/login');
    },
    [history, token]
  );

  const passwordRepeatValidation: ValidationRules = {
    ...passwordValidation,
    validate: (value: string) => value === watch('password') || '两次输入的密码不相同',
  };
  return (
    <>
      <Title>重设密码</Title>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div css={[mY(2)]}>
          <Label htmlFor="password">密码</Label>
          <div>
            <Input css={largeInput} type="password" name="password" id="password" ref={register(passwordValidation)} />
          </div>
          <div>{errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}</div>

          <div css={[mY(2)]}>
            <Label htmlFor="passwordRepeat">重复密码</Label>
            <div>
              <Input
                css={largeInput}
                type="password"
                name="passwordRepeat"
                id="password"
                ref={register(passwordRepeatValidation)}
              />
            </div>
            <div>{errors.passwordRepeat && <ErrorMessage>{errors.passwordRepeat.message}</ErrorMessage>}</div>
          </div>
          <div css={[alignRight]}>
            <Button css={[textLg, mT(2)]} disabled={state === 'loading'} data-variant="primary" type="submit">
              发送密码重置邮件
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}

export default ResetPasswordConfirm;
