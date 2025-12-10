'use client';

import { type ApiError } from '@boluo/api';
import { login } from '@boluo/api-browser';
import { explainError } from '@boluo/locale/errors';
import { type FC, type ReactNode, useId, useState } from 'react';
import {
  type FieldError,
  FormProvider,
  type SubmitHandler,
  useForm,
  useFormContext,
  useFormState,
} from 'react-hook-form';
import { FormattedMessage, type IntlShape, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button } from '@boluo/ui/Button';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';
import { TextInput } from '@boluo/ui/TextInput';
import { type StyleProps } from '@boluo/types';

interface Props extends StyleProps {
  onSuccess?: () => void;
  onError?: (error: ApiError) => void;
}
interface Inputs {
  username: string;
  password: string;
}

const FormErrorDisplay: FC<{ error: ApiError; intl: IntlShape }> = ({ error, intl }) => {
  let errorMessage: ReactNode;

  if (error.code === 'NO_PERMISSION') {
    errorMessage = <FormattedMessage defaultMessage="Username and password do not match" />;
  } else {
    errorMessage = <span>{explainError(intl, error)}</span>;
  }

  return <ErrorMessageBox>{errorMessage}</ErrorMessageBox>;
};

const ErrorMessage: FC<{ error?: FieldError }> = ({ error }) => {
  if (!error) {
    return null;
  }
  return <div className="mt-1 text-sm">{error.message}</div>;
};

const UsernameField = () => {
  const id = useId();
  const intl = useIntl();
  const {
    register,
    formState: {
      errors: { username: error },
    },
  } = useFormContext<Inputs>();
  return (
    <div>
      <label htmlFor={id} className="block w-full py-1">
        <FormattedMessage defaultMessage="Username or Email" />
      </label>

      <TextInput
        className="w-full"
        id={id}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="username"
        enablePasswordManagerAutoComplete
        variant={error ? 'error' : 'normal'}
        {...register('username', {
          required: intl.formatMessage({ defaultMessage: "Can't be empty." }),
        })}
      />

      <ErrorMessage error={error} />
    </div>
  );
};

const PasswordField = () => {
  const id = useId();
  const intl = useIntl();
  const {
    register,
    formState: {
      errors: { password: error },
    },
  } = useFormContext<Inputs>();
  return (
    <div>
      <label htmlFor={id} className="block w-full py-1">
        <FormattedMessage defaultMessage="Password" />
      </label>
      <TextInput
        id={id}
        type="password"
        autoComplete="current-password"
        enablePasswordManagerAutoComplete
        className="w-full"
        variant={error ? 'error' : 'normal'}
        {...register('password', {
          required: intl.formatMessage({ defaultMessage: "Can't be empty." }),
        })}
      />
      <ErrorMessage error={error} />
    </div>
  );
};

const FormContent: FC<{ error: ApiError | null }> = ({ error }) => {
  const intl = useIntl();
  const { isSubmitting, isDirty } = useFormState();
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
        <div className="text-state-danger-text my-1">
          <FormErrorDisplay error={error} intl={intl} />
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <Button variant="primary" type="submit" disabled={!isDirty || isSubmitting}>
          <FormattedMessage defaultMessage="Login" />
        </Button>
      </div>
    </div>
  );
};

export const LoginForm: FC<Props> = ({ onSuccess, onError, className = '' }) => {
  const { mutate } = useSWRConfig();
  const methods = useForm<Inputs>();
  const { handleSubmit } = methods;
  const [error, setError] = useState<ApiError | null>(null);
  const onSubmit: SubmitHandler<Inputs> = async ({ password, username }) => {
    const result = await login(username, password);
    if (result.isErr) {
      setError(result.err);
      if (onError) {
        onError(result.err);
      }
      return;
    }
    setError(null);
    const { me } = result.some;
    await mutate(['/users/query', null], me.user);
    await mutate(
      (key) => {
        if (!Array.isArray(key)) return false;
        return key[0] === '/channels/by_space';
      },
      undefined,
      { revalidate: true },
    );

    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className={className}>
        <FormContent error={error} />
      </form>
    </FormProvider>
  );
};
