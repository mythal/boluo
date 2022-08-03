import * as React from 'react';
import { useTitle } from '../../hooks/useTitle';
import Title from '../atoms/Title';
import { mY, largeInput, flex, textLg, mT, alignRight } from '../../styles/atoms';
import { Label } from '../atoms/Label';
import Input from '../atoms/Input';
import Button from '../atoms/Button';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { required } from '../../validators';
import { post } from '../../api/request';
import { useDispatch } from '../../store';
import Loading from '../molecules/Loading';
import { showFlash } from '../../actions';

interface FormData {
  email: string;
}

function ResetPassword() {
  useTitle('重设密码');
  const dispatch = useDispatch();
  const { register, handleSubmit } = useForm<FormData>();
  const [state, setState] = useState<'loading' | 'sent' | 'default' | 'error'>('default');

  const onSubmit = useCallback(
    async ({ email }: FormData) => {
      setState('loading');
      const result = await post('/users/reset_password', { email });
      if (result.isErr) {
        const error = result.value;
        if (error.code === 'LIMIT_EXCEEDED') {
          showFlash(dispatch, 'ERROR', '超出请求限制');
        } else {
          showFlash(dispatch, 'ERROR', '未知错误');
        }
        setState('error');
        return;
      }
      setState('sent');
    },
    [dispatch]
  );

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
            <Button
              css={[textLg, mT(2)]}
              disabled={state === 'loading' || state === 'error'}
              data-variant="primary"
              type="submit"
            >
              {state === 'loading' ? <Loading text="发送中…" /> : '发送密码重置邮件'}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}

export default ResetPassword;
