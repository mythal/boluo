'use client';

import { ApiError } from 'api';
import { usePost } from 'common';
import { FC, useId, useState } from 'react';
import { FormProvider, SubmitHandler, useForm, useFormContext } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button, Label, TextInput } from 'ui';
import { StyleProps } from 'utils';

interface Props extends StyleProps {
}
interface Inputs {
  username: string;
  password: string;
}

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
          {...register('username', { required: intl.formatMessage({ defaultMessage: "Can't be empty." }) })}
        />
      </div>
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
          {...register('password', { required: intl.formatMessage({ defaultMessage: "Can't be empty." }) })}
        />
      </div>
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

      <div className="mt-2 flex justify-end">
        <Button data-type="primary" type="submit">
          <FormattedMessage defaultMessage="Login" />
        </Button>
      </div>
    </div>
  );
};

export const LoginForm: FC<Props> = () => {
  const { mutate } = useSWRConfig();
  const methods = useForm<Inputs>();
  const { handleSubmit } = methods;
  const [error, setError] = useState<ApiError | null>(null);
  const post = usePost();
  const onSubmit: SubmitHandler<Inputs> = async ({ password, username }) => {
    const result = await post('/users/login', null, { password, username });
    if (result.isErr) {
      return setError(result.err);
    }
    setError(null);
    await mutate('/users/get_me', result.some.me);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormContent error={error} />
      </form>
    </FormProvider>
  );
};
