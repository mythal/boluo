'use client';
import type { ApiError } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { explainError } from '@boluo/locale/errors';
import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import { useId, useState } from 'react';
import { type FieldError, type SubmitHandler, useFormState } from 'react-hook-form';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { FormattedMessage, type IntlShape, useIntl } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';
import { TextInput } from '@boluo/ui/TextInput';
import * as validations from '@boluo/common/validations';

// https://web.dev/sign-in-form-best-practices/

interface Schema {
  username: string;
  password: string;
  email: string;
  nickname: string;
}

const FormErrorDisplay: FC<{ error: ApiError; intl: IntlShape }> = ({ error, intl }) => {
  return <ErrorMessageBox>{explainError(intl, error)}</ErrorMessageBox>;
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
  const {
    register,
    formState: {
      errors: { username: error },
    },
  } = useFormContext<Schema>();
  return (
    <>
      <div>
        <label htmlFor={id} className="block w-full py-1">
          <FormattedMessage defaultMessage="Username" />
        </label>

        <TextInput
          className="w-full"
          id={id}
          autoComplete="username"
          variant={error ? 'error' : 'normal'}
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
  const {
    register,
    formState: {
      errors: { email: error },
    },
  } = useFormContext<Schema>();
  return (
    <>
      <div>
        <label htmlFor={id} className="block w-full py-1">
          <FormattedMessage defaultMessage="EMail" />
        </label>

        <TextInput
          className="w-full"
          type="email"
          id={id}
          autoComplete="email"
          variant={error ? 'error' : 'normal'}
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
  const {
    register,
    formState: {
      errors: { nickname: error },
    },
  } = useFormContext<Schema>();
  return (
    <>
      <div>
        <label htmlFor={id} className="block w-full py-1">
          <FormattedMessage defaultMessage="Nickname" />
        </label>

        <TextInput
          className="w-full"
          id={id}
          autoComplete="nickname"
          variant={error ? 'error' : 'normal'}
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
  const {
    register,
    formState: {
      errors: { password: error },
    },
  } = useFormContext<Schema>();
  return (
    <>
      <div>
        <div className="flex py-1">
          <label htmlFor={id} className="grow">
            <FormattedMessage defaultMessage="Password" />
          </label>

          <button
            type="button"
            onClick={() => setShow((show) => !show)}
            className="text-text-link hover:text-text-link-hover"
          >
            {show ? (
              <FormattedMessage defaultMessage="Hide" />
            ) : (
              <FormattedMessage defaultMessage="Show" />
            )}
          </button>
        </div>
        <TextInput
          className="w-full"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          id={id}
          variant={error ? 'error' : 'normal'}
          {...register('password', validations.password(intl))}
        />
      </div>
      <FieldErrorDisplay error={error} />
    </>
  );
};

const FormContent: FC<{ error: ApiError | null }> = ({ error }) => {
  const intl = useIntl();
  const { isSubmitting, isValid } = useFormState();
  return (
    <div className="flex flex-col gap-2">
      <div className="text-center text-xl">
        <FormattedMessage defaultMessage="Sign Up" />
      </div>
      <UsernameField />
      <EmailField />
      <NicknameField />
      <PasswordField />
      {error && (
        <div className="text-state-danger-text my-1">
          <FormErrorDisplay error={error} intl={intl} />
        </div>
      )}
      <div className="mt-2 flex justify-end">
        <Button variant="primary" type="submit" disabled={!isValid || isSubmitting}>
          <FormattedMessage defaultMessage="Sign Up" />
        </Button>
      </div>
    </div>
  );
};

export const SignUpForm = () => {
  const router = useRouter();
  const methods = useForm<Schema>({ mode: 'onChange' });
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
      <form onSubmit={methods.handleSubmit(onSubmit)} className="py-6">
        <FormContent error={error} />
      </form>
    </FormProvider>
  );
};
