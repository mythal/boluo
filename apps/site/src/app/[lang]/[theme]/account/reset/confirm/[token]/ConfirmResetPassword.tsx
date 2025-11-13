'use client';

import { TextInput } from '@boluo/ui/TextInput';
import { isUuid } from '@boluo/utils/id';
import Link from 'next/link';
import { type FC, useId, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import * as validators from '@boluo/common/validations';
import { Button } from '@boluo/ui/Button';
import { post } from '@boluo/api-browser';
import { useRouter } from 'next/navigation';
import * as classes from '@boluo/ui/classes';

interface Props {
  token: string;
}

interface FormSchema {
  password: string;
}

export const ConfirmResetPassword: FC<Props> = ({ token }) => {
  const intl = useIntl();
  const id = useId();
  const [pageState, setPageState] = useState<'FORM' | 'UNKNOWN_ERROR' | 'INVALID_TOKEN'>('FORM');
  const { register, handleSubmit } = useForm<FormSchema>();
  const router = useRouter();
  const onSubmit: SubmitHandler<FormSchema> = async ({ password }) => {
    const result = await post('/users/reset_password_confirm', null, { token, password });
    if (result.isOk) {
      router.push('/account/login');
      return;
    }
    const { err } = result;
    if (err.code === 'NOT_FOUND') {
      setPageState('INVALID_TOKEN');
      return;
    } else {
      console.warn(err);
      setPageState('UNKNOWN_ERROR');
    }
  };
  if (pageState === 'UNKNOWN_ERROR') {
    <div className="py-6">
      <FormattedMessage defaultMessage="An unknown error occurred." />
    </div>;
  }
  if (!isUuid(token) || pageState === 'INVALID_TOKEN') {
    return (
      <div className="flex flex-col gap-2 pt-2">
        <div className="">
          <FormattedMessage defaultMessage="Unable to reset your password, invalid reset link." />
        </div>
        <div className="">
          <Link href="/account/reset" className={classes.link}>
            <FormattedMessage defaultMessage="Try again" />
          </Link>
        </div>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 pt-2">
      <div>
        <label htmlFor={id} className="block py-1">
          <FormattedMessage defaultMessage="New password" />
        </label>
        <TextInput
          id={id}
          className="w-full"
          autoComplete="new-password"
          type="password"
          {...register('password', validators.password(intl))}
        />
      </div>

      <div className="text-right">
        <Button type="submit">
          <FormattedMessage defaultMessage="Reset password" />
        </Button>
      </div>
    </form>
  );
};
