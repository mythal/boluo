'use client';
import type { ApiError, CreateSpace } from 'boluo-api';
import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import { useId, useState } from 'react';
import type { FieldError, SubmitHandler } from 'react-hook-form';
import { FormProvider, useController, useForm, useFormContext } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button, Label, Oops, Select, TextArea, TextInput } from 'ui';
import type { SelectItem } from 'ui/Select';
import { post } from '../api/browser';
import { required } from '../validations';
import { DiceSelect } from './DiceSelect';

const FormErrorDispay: FC<{ error: ApiError }> = ({ error }) => {
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

interface Props {
}

const NameField: FC = () => {
  const intl = useIntl();
  const id = useId();
  const { register, formState: { errors: { name: error } } } = useFormContext<CreateSpace>();
  return (
    <div>
      <Label htmlFor={id}>
        <FormattedMessage defaultMessage="Space Name" />
      </Label>

      <TextInput
        className="w-full"
        id={id}
        data-state={error ? 'error' : 'default'}
        {...register('name', required(intl))}
      />
      <FieldErrorDisplay error={error} />
    </div>
  );
};

const dices: SelectItem[] = [
  { label: 'D20', value: 'd20' },
  { label: 'D100', value: 'd100' },
];

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
      <Label htmlFor={id}>
        <FormattedMessage defaultMessage="Default Dice" />
      </Label>
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
  const { register, formState: { errors: { firstChannelName: error } } } = useFormContext<CreateSpace>();
  return (
    <div>
      <Label htmlFor={id}>
        <FormattedMessage defaultMessage="Initial Channel Name" />
      </Label>

      <TextInput
        className="w-full"
        id={id}
        data-state={error ? 'error' : 'default'}
        {...register('firstChannelName', required(intl))}
      />
      <FieldErrorDisplay error={error} />
    </div>
  );
};

const DescriptionField: FC = () => {
  const intl = useIntl();
  const id = useId();
  const { register, formState: { errors: { description: error } } } = useFormContext<CreateSpace>();
  return (
    <div>
      <Label htmlFor={id}>
        <FormattedMessage defaultMessage="Description" />
      </Label>
      <TextArea className="w-full" data-state={error ? 'error' : 'default'} {...register('description')} />
      <FieldErrorDisplay error={error} />
    </div>
  );
};

export const CreateSpaceForm: FC<Props> = () => {
  const { mutate } = useSWRConfig();
  const methods = useForm<CreateSpace>({
    defaultValues: {},
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
        <div>
          <NameField />
          <FirstChannelNameField />
          <DescriptionField />
          <DefaultDiceField />
        </div>
        {error && <FormErrorDispay error={error} />}
        <div className="w-full mt-4">
          <Button data-type="primary" type="submit">
            <FormattedMessage defaultMessage="Create" />
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};
