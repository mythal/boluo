import type { ApiError, CreateSpace, Space, SpaceWithMember } from 'api';
import { post } from 'api-browser';
import { useErrorExplain } from 'common';
import { required } from 'common/validations';
import type { FC } from 'react';
import { useId } from 'react';
import type { FieldError, SubmitHandler } from 'react-hook-form';
import { FormProvider, useController, useForm, useFormContext } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';
import { Button } from 'ui/Button';
import { ErrorMessageBox } from 'ui/ErrorMessageBox';
import { TextArea, TextInput } from 'ui/TextInput';
import { DiceSelect } from './DiceSelect';
import { PaneFooterBox } from './PaneFooterBox';

const FormErrorDispay: FC<{ error: ApiError }> = ({ error }) => {
  const explain = useErrorExplain();
  return (
    <ErrorMessageBox>
      {explain(error)}
    </ErrorMessageBox>
  );
};

const FieldErrorDisplay: FC<{ error?: FieldError }> = ({ error }) => {
  if (!error) {
    return null;
  }
  return <div className="mt-1 text-sm">{error.message}</div>;
};

interface Props {
  onSuccess?: (space: Space) => void;
  close?: () => void;
}

const NameField: FC = () => {
  const intl = useIntl();
  const id = useId();
  const { register, formState: { errors: { name: error } } } = useFormContext<CreateSpace>();
  return (
    <div>
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Space Name" />
      </label>

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
      <label className="block pb-1" htmlFor={id}>
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
  const { register, formState: { errors: { firstChannelName: error } } } = useFormContext<CreateSpace>();
  return (
    <div>
      <label htmlFor={id} className="block pb-1">
        <FormattedMessage defaultMessage="Initial Channel Name" />
      </label>

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
      <label htmlFor={id} className="block pb-1">
        <FormattedMessage defaultMessage="Description" />
      </label>
      <TextArea className="w-full" data-state={error ? 'error' : 'default'} {...register('description')} />
      <FieldErrorDisplay error={error} />
    </div>
  );
};

export const CreateSpaceForm: FC<Props> = ({ onSuccess, close }) => {
  const { mutate } = useSWRConfig();
  const form = useForm<CreateSpace>({
    defaultValues: {},
  });
  const { handleSubmit } = form;
  const key = ['/spaces/create'] as const;
  const createSpace: MutationFetcher<SpaceWithMember, CreateSpace, typeof key> = async (_, { arg: params }) => {
    const result = await post('/spaces/create', null, params);
    return result.unwrap();
  };
  const { trigger, error: creationError, isMutating: isCreating } = useSWRMutation<
    SpaceWithMember,
    ApiError,
    typeof key,
    CreateSpace
  >(key, createSpace, {
    onSuccess: async ({ space }) => {
      await mutate(['/spaces/my', null]);
      onSuccess?.(space);
    },
  });

  const onSubmit: SubmitHandler<CreateSpace> = async (params) => {
    await trigger(params);
  };
  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2 h-full max-w-md p-4">
          <NameField />
          <FirstChannelNameField />
          <DescriptionField />
          <DefaultDiceField />
          {creationError && <FormErrorDispay error={creationError} />}
        </div>
        <PaneFooterBox>
          {close && (
            <Button type="button" onClick={close}>
              <FormattedMessage defaultMessage="Cancel" />
            </Button>
          )}
          <Button data-type="primary" type="submit" disabled={!form.formState.isDirty || isCreating}>
            <FormattedMessage defaultMessage="Create Space" />
          </Button>
        </PaneFooterBox>
      </form>
    </FormProvider>
  );
};
