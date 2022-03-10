import * as React from 'react';
import { useTitle } from '../../hooks/useTitle';
import Title from '../atoms/Title';
import { mY, largeInput, flex, textLg, mL, mT, alignRight } from '../../styles/atoms';
import { Label } from '../atoms/Label';
import Input from '../atoms/Input';
import Button from '../atoms/Button';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { required } from '../../validators';
import { post } from '../../api/request';

interface FormData {
  email: string;
}

function ResetPassword() {
  useTitle('重设密码');
  const { register, handleSubmit } = useForm<FormData>();
  const [state, setState] = useState<'loading' | 'sent' | 'default'>('default');

  const onSubmit = useCallback(async ({ email }: FormData) => {
    setState('loading');
    await post('/users/reset_password', { email });
    setState('sent');
  }, []);

  return (
    <>
      <Title>重设密码</Title>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div css={[mY(2)]}>
          <Label htmlFor="email">邮箱地址</Label>
          <div css={flex}>
            <Input
              css={largeInput}
              type="email"
              name="email"
              id="email"
              placeholder="someone@example.com"
              ref={register({ required })}
            />
          </div>
          {state === 'sent' && <div css={mY(2)}>已发送，请在邮箱查收，如果找不到请检查垃圾邮箱。</div>}
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

export default ResetPassword;
