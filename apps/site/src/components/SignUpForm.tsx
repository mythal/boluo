'use client';
import type { ApiError } from 'boluo-api';
import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import { useId, useState } from 'react';
import type { FieldError, SubmitHandler } from 'react-hook-form';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button, Label, Oops, TextInput } from 'ui';
import { post } from '../api/browser';
import * as validations from '../validations';

// https://web.dev/sign-in-form-best-practices/

interface Schema {
  username: string;
  password: string;
  email: string;
  nickname: string;
}

const FormErrorDisplay: FC<{ error: ApiError }> = ({ error }) => {
  return (
    <div className="my-1 text-error-700">
      <Oops error={error} type="inline" />
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
  const intl = useIntl();
  const id = useId();
  const { register, formState: { errors: { username: error } } } = useFormContext<Schema>();
  return (
    <>
      <div>
        <Label htmlFor={id} className="w-full block py-1">
          <FormattedMessage defaultMessage="Username" />
        </Label>

        <TextInput
          className="w-full"
          id={id}
          autoComplete="username"
          data-state={error ? 'error' : 'default'}
          {...register('username', validations.username(intl))}
        />
      </div>
      <FieldErrorDisplay error={error} />
    </>
  );
};

const EmailField = () => {
  const intl = useIntl();
  const id = useId();
  const { register, formState: { errors: { email: error } } } = useFormContext<Schema>();
  return (
    <>
      <div>
        <Label htmlFor={id} className="w-full block py-1">
          <FormattedMessage defaultMessage="EMail" />
        </Label>

        <TextInput
          className="w-full"
          type="email"
          id={id}
          autoComplete="email"
          data-state={error ? 'error' : 'default'}
          {...register('email', validations.email(intl))}
        />
      </div>
      <FieldErrorDisplay error={error} />
    </>
  );
};
const NicknameField = () => {
  const intl = useIntl();
  const id = useId();
  const { register, formState: { errors: { nickname: error } } } = useFormContext<Schema>();
  return (
    <>
      <div>
        <Label htmlFor={id} className="w-full block py-1">
          <FormattedMessage defaultMessage="Nickname" />
        </Label>

        <TextInput
          className="w-full"
          id={id}
          autoComplete="nickname"
          data-state={error ? 'error' : 'default'}
          {...register('nickname', validations.nickname(intl))}
        />
      </div>
      <FieldErrorDisplay error={error} />
    </>
  );
};

const PasswordField = () => {
  const intl = useIntl();
  const id = useId();
  const [show, setShow] = useState(false);
  const { register, formState: { errors: { password: error } } } = useFormContext<Schema>();
  return (
    <>
      <div>
        <div className="flex py-1">
          <Label htmlFor={id} className="flex-grow">
            <FormattedMessage defaultMessage="Password" />
          </Label>

          <button type="button" onClick={() => setShow((show) => !show)} className="text-brand-700">
            {show ? <FormattedMessage defaultMessage="Hide" /> : <FormattedMessage defaultMessage="Show" />}
          </button>
        </div>
        <TextInput
          className="w-full"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          id={id}
          data-state={error ? 'error' : 'default'}
          {...register('password', validations.password(intl))}
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
        <FormattedMessage defaultMessage="Sign Up" />
      </div>
      <div>
        <UsernameField />
        <EmailField />
        <NicknameField />
        <PasswordField />
      </div>
      {error && (
        <div className="my-1 text-error-700">
          <FormErrorDisplay error={error} />
        </div>
      )}
      <div className="mt-2 flex justify-end">
        <Button data-type="primary" type="submit">
          <FormattedMessage defaultMessage="Sign Up" />
        </Button>
      </div>
    </div>
  );
};

export const SignUpForm = () => {
  const router = useRouter();
  const methods = useForm<Schema>();
  const [error, setError] = useState<ApiError | null>(null);

  const onSubmit: SubmitHandler<Schema> = async ({ password, username, email, nickname }) => {
    const result = await post('/users/register', null, { password, username, email, nickname });
    if (result.isErr) {
      return setError(result.err);
    }
    setError(null);
    router.push('/account/login');
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <FormContent error={error} />
      </form>
    </FormProvider>
  );
};
