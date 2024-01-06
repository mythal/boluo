'use client';

import { ApiError } from 'api';
import { post } from 'api-browser';
import { FC, useId } from 'react';
import { FieldError, FormProvider, SubmitHandler, useForm, useFormContext, useFormState } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button } from 'ui/Button';
import { TextInput } from 'ui/TextInput';
import { StyleProps } from 'utils';

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
    <>
      <div>
        <label htmlFor={id} className="w-full block py-1">
          <FormattedMessage defaultMessage="Username or Email" />
        </label>

        <TextInput
          className="w-full"
          id={id}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="username"
          data-state={error ? 'error' : 'default'}
          {...register('username', { required: intl.formatMessage({ defaultMessage: "Can't be empty." }) })}
        />

        <ErrorMessage error={error} />
      </div>
    </>
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
    <>
      <div>
        <label htmlFor={id} className="w-full block py-1">
          <FormattedMessage defaultMessage="Password" />
        </label>
        <TextInput
          id={id}
          type="password"
          autoComplete="current-password"
          className="w-full"
          data-state={error ? 'error' : 'default'}
          {...register('password', { required: intl.formatMessage({ defaultMessage: "Can't be empty." }) })}
        />
        <ErrorMessage error={error} />
      </div>
    </>
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
        <Button data-type="primary" type="submit" disabled={!isDirty || isSubmitting}>
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
    const result = await post('/users/login', null, { password, username });
    if (result.isErr) {
      if (onError) {
        onError(result.err);
      }
      return;
    }
    const { me } = result.some;
    await mutate(['/users/get_me'], me);
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
