'use client';

import { post } from '@boluo/api-browser';
import { TextInput } from '@boluo/ui/TextInput';
import { useId, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import * as validators from '@boluo/common/validations';
import { Button } from '@boluo/ui/Button';

interface FormSchema {
  email: string;
}

export const ResetPassword = () => {
  const { handleSubmit, register } = useForm<FormSchema>();
  const id = useId();
  const [pageState, setPageState] = useState<'FORM' | 'SUCCESS' | 'NOT_FOUND' | 'UNKNOWN_ERROR'>(
    'FORM',
  );
  const intl = useIntl();
  const onSubmit: SubmitHandler<FormSchema> = async ({ email }) => {
    const result = await post('/users/reset_password', null, { email, lang: intl.locale });
    if (result.isErr && result.err.code === 'NOT_FOUND') {
      setPageState('NOT_FOUND');
    } else if (result.isErr) {
      console.warn(result.err);
      setPageState('UNKNOWN_ERROR');
    }
    setPageState('SUCCESS');
  };
  if (pageState === 'SUCCESS') {
    return (
      <div className="py-6">
        <FormattedMessage defaultMessage="The password reset email has been sent." />
      </div>
    );
  } else if (pageState === 'NOT_FOUND') {
    return (
      <div className="py-6">
        <FormattedMessage defaultMessage="The email address is not registered." />
      </div>
    );
  } else if (pageState === 'UNKNOWN_ERROR') {
    return (
      <div className="py-6">
        <FormattedMessage defaultMessage="An unknown error occurred." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
      <div>
        <label htmlFor={id} className="block py-1">
          <FormattedMessage defaultMessage="Email" />
        </label>

        <div className="">
          <TextInput
            id={id}
            type="email"
            className="w-full"
            {...register('email', { ...validators.required(intl) })}
          />
        </div>
      </div>

      <div className="text-right">
        <Button type="submit">
          <FormattedMessage defaultMessage="Send Password Reset Email" />
        </Button>
      </div>
    </form>
  );
};
