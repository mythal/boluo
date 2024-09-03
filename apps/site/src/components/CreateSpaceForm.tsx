'use client';
import type { ApiError, CreateSpace } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import { useId, useState } from 'react';
import type { FieldError, SubmitHandler } from 'react-hook-form';
import { FormProvider, useController, useForm, useFormContext } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button } from '@boluo/ui/Button';
import { Oops } from '@boluo/ui/Oops';
import { TextArea, TextInput } from '@boluo/ui/TextInput';
import { required } from '../validations';
import { DiceSelect } from './DiceSelect';

const FormErrorDispay: FC<{ error: ApiError }> = ({ error }) => {
  return (
    <div className="text-error-700 my-1">
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

interface Props {}

const NameField: FC = () => {
  const intl = useIntl();
  const id = useId();
  const {
    register,
    formState: {
      errors: { name: error },
    },
  } = useFormContext<CreateSpace>();
  return (
    <div>
      <label className="block py-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Space Name" />
      </label>

      <TextInput
        className="w-full"
        id={id}
        variant={error ? 'error' : 'normal'}
        {...register('name', required(intl))}
      />
      <FieldErrorDisplay error={error} />
    </div>
  );
};

const DefaultDiceField: FC = () => {
  const id = useId();
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController<CreateSpace, 'defaultDiceType'>({
    name: 'defaultDiceType',
    defaultValue: 'd20',
  });
  return (
    <div>
      <label className="block py-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Default Dice" />
      </label>
      <div>
        <DiceSelect value={value ?? 'd20'} onChange={onChange} />
      </div>
      <FieldErrorDisplay error={error} />
    </div>
  );
};

const FirstChannelNameField: FC = () => {
  const intl = useIntl();
  const id = useId();
  const {
    register,
    formState: {
      errors: { firstChannelName: error },
    },
  } = useFormContext<CreateSpace>();
  return (
    <div>
      <label className="block py-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Initial Channel Name" />
      </label>

      <TextInput
        className="w-full"
        id={id}
        variant={error ? 'error' : 'normal'}
        {...register('firstChannelName', required(intl))}
      />
      <FieldErrorDisplay error={error} />
    </div>
  );
};

const DescriptionField: FC = () => {
  const intl = useIntl();
  const id = useId();
  const {
    register,
    formState: {
      errors: { description: error },
    },
  } = useFormContext<CreateSpace>();
  return (
    <div>
      <label className="block py-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Description" />
      </label>
      <TextArea className="w-full" variant={error ? 'error' : 'normal'} {...register('description')} />
      <FieldErrorDisplay error={error} />
    </div>
  );
};

export const CreateSpaceForm: FC<Props> = () => {
  const intl = useIntl();
  const { mutate } = useSWRConfig();
  const methods = useForm<CreateSpace>({
    defaultValues: {
      firstChannelName: intl.formatMessage({ defaultMessage: 'General' }),
      firstChannelType: 'OUT_OF_GAME',
    },
  });
  const { handleSubmit } = methods;
  const [error, setError] = useState<ApiError | null>(null);
  const router = useRouter();
  const onSubmit: SubmitHandler<CreateSpace> = async (params) => {
    const result = await post('/spaces/create', null, params);
    if (result.isErr) {
      setError(result.err);
      return;
    }
    const { space, member } = result.some;
    await mutate('/spaces/my');
    router.push('/');
  };
  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <NameField />
          <FirstChannelNameField />
          <DescriptionField />
          <DefaultDiceField />
        </div>
        {error && <FormErrorDispay error={error} />}
        <div className="mt-4 w-full">
          <Button variant="primary" type="submit">
            <FormattedMessage defaultMessage="Create" />
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};
