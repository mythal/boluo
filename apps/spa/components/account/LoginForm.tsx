'use client';

import { type ApiError } from '@boluo/api';
import { login } from '@boluo/api-browser';
import { type FC, useId } from 'react';
import {
  type FieldError,
  FormProvider,
  type SubmitHandler,
  useForm,
  useFormContext,
  useFormState,
} from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button } from '@boluo/ui/Button';
import { TextInput } from '@boluo/ui/TextInput';
import { type StyleProps } from '@boluo/utils';

interface Props extends StyleProps {
  onSuccess?: () => void;
  onError?: (error: ApiError) => void;
}
interface Inputs {
  username: string;
  password: string;
}

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

const FormContent: FC = () => {
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
  const onSubmit: SubmitHandler<Inputs> = async ({ password, username }) => {
    const result = await login(username, password);
    if (result.isErr) {
      if (onError) {
        onError(result.err);
      }
      return;
    }
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
        <FormContent />
      </form>
    </FormProvider>
  );
};
