'use client';
import type { ApiError } from 'boluo-api';
import { useRouter } from 'next/navigation';
import type { FC, ReactNode } from 'react';
import { useId } from 'react';
import { useState } from 'react';
import type { FieldError, SubmitHandler } from 'react-hook-form';
import { FormProvider, useFormContext } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button, Label, Oops, TextInput } from 'ui';
import { post } from '../api/browser';
import type { StyleProps } from '../helper/props';
import { required } from '../validations';

// https://web.dev/sign-in-form-best-practices/

interface Props extends StyleProps {
}

interface Inputs {
  username: string;
  password: string;
}

const FormErrorDisplay: FC<{ error: ApiError }> = ({ error }) => {
  let oops: ReactNode;

  if (error.code === 'NO_PERMISSION') {
    oops = <FormattedMessage defaultMessage="Username and password do not match" />;
  } else {
    oops = <Oops error={error} type="inline" />;
  }
  return (
    <div className="my-1 text-error-700">
      {oops}
    </div>
  );
};

const FieldErrorDisplay: FC<{ error?: FieldError }> = ({ error }) => {
  if (!error) {
    return null;
  }
  return <div className="mt-1 text-sm">{error.message}</div>;
};

const UsernameField = () => {
  const id = useId();
  const intl = useIntl();
  const { register, formState: { errors: { username: error } } } = useFormContext<Inputs>();
  return (
    <>
      <div>
        <Label htmlFor={id} className="w-full block py-1">
          <FormattedMessage defaultMessage="Username or Email" />
        </Label>

        <TextInput
          className="w-full"
          id={id}
          autoComplete="username"
          data-state={error ? 'error' : 'default'}
          {...register('username', required(intl))}
        />
      </div>
      <FieldErrorDisplay error={error} />
    </>
  );
};

const PasswordField = () => {
  const id = useId();
  const intl = useIntl();
  const { register, formState: { errors: { password: error } } } = useFormContext<Inputs>();
  return (
    <>
      <div>
        <Label htmlFor={id} className="w-full block py-1">
          <FormattedMessage defaultMessage="Password" />
        </Label>
        <TextInput
          id={id}
          type="password"
          autoComplete="current-password"
          className="w-full"
          data-state={error ? 'error' : 'default'}
          {...register('password', required(intl))}
        />
      </div>
      <FieldErrorDisplay error={error} />
    </>
  );
};

const FormContent: FC<{ error: ApiError | null }> = ({ error }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-2xl">
        <FormattedMessage defaultMessage="Login" />
      </div>

      <div className="w-full">
        <UsernameField />
      </div>
      <div className="w-full">
        <PasswordField />
      </div>

      {error && (
        <div className="my-1 text-error-700">
          <FormErrorDisplay error={error} />
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <Button data-type="primary" type="submit">
          <FormattedMessage defaultMessage="Login" />
        </Button>
      </div>
    </div>
  );
};

export const LoginForm: FC<Props> = () => {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const methods = useForm<Inputs>();
  const { handleSubmit } = methods;
  const [error, setError] = useState<ApiError | null>(null);
  const onSubmit: SubmitHandler<Inputs> = async ({ password, username }) => {
    const result = await post('/users/login', null, { password, username });
    if (result.isErr) {
      return setError(result.err);
    }
    setError(null);
    await mutate('/users/get_me', result.some.me);
    router.push('/');
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormContent error={error} />
      </form>
    </FormProvider>
  );
};
