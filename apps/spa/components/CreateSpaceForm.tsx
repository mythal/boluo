import type { ApiError, CreateSpace, Space, SpaceWithMember } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { explainError } from '@boluo/locale/errors';
import { channelNameValidation, spaceName } from '@boluo/common/validations';
import type { FC } from 'react';
import { useId } from 'react';
import type { FieldError, SubmitHandler } from 'react-hook-form';
import { FormProvider, useController, useForm, useFormContext } from 'react-hook-form';
import { FormattedMessage, type IntlShape, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import useSWRMutation, { type MutationFetcher } from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';
import { TextArea, TextInput } from '@boluo/ui/TextInput';
import { DiceSelect } from '@boluo/ui/DiceSelect';
import { PaneFooterBox } from './PaneFooterBox';

const FormErrorDispay: FC<{ error: ApiError; intl: IntlShape }> = ({ error, intl }) => {
  return <ErrorMessageBox>{explainError(intl, error)}</ErrorMessageBox>;
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
  const {
    register,
    formState: {
      errors: { name: error },
    },
  } = useFormContext<CreateSpace>();
  return (
    <div className="NameField">
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Space Name" />
      </label>

      <TextInput
        className="w-full"
        id={id}
        variant={error ? 'error' : 'normal'}
        {...register('name', spaceName(intl))}
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
    <div className="DefaultDiceField">
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
  const {
    register,
    formState: {
      errors: { firstChannelName: error },
    },
  } = useFormContext<CreateSpace>();
  return (
    <div className="FirstChannelNameField">
      <label htmlFor={id} className="block pb-1">
        <FormattedMessage defaultMessage="Initial Channel Name" />
      </label>

      <TextInput
        className="w-full"
        id={id}
        variant={error ? 'error' : 'normal'}
        {...register('firstChannelName', channelNameValidation(intl))}
      />
      <FieldErrorDisplay error={error} />
    </div>
  );
};

const DescriptionField: FC = () => {
  const id = useId();
  const {
    register,
    formState: {
      errors: { description: error },
    },
  } = useFormContext<CreateSpace>();
  return (
    <div className="DescriptionField">
      <label htmlFor={id} className="block pb-1">
        <FormattedMessage defaultMessage="Description" />
      </label>
      <TextArea
        className="w-full"
        variant={error ? 'error' : 'normal'}
        {...register('description')}
      />
      <FieldErrorDisplay error={error} />
    </div>
  );
};

export const CreateSpaceForm: FC<Props> = ({ onSuccess, close }) => {
  const intl = useIntl();
  const { mutate } = useSWRConfig();
  const form = useForm<CreateSpace>({
    defaultValues: {
      firstChannelName: intl.formatMessage({ defaultMessage: 'General' }),
      firstChannelType: 'OUT_OF_GAME',
    },
  });
  const { handleSubmit } = form;
  const key = ['/spaces/create'] as const;
  const createSpace: MutationFetcher<SpaceWithMember, typeof key, CreateSpace> = async (
    _,
    { arg: params },
  ) => {
    const result = await post('/spaces/create', null, params);
    return result.unwrap();
  };
  const {
    trigger,
    error: creationError,
    isMutating: isCreating,
  } = useSWRMutation<SpaceWithMember, ApiError, typeof key, CreateSpace>(key, createSpace, {
    onSuccess: ({ space }) => {
      void mutate(['/spaces/my', null]);
      onSuccess?.(space);
    },
  });

  const onSubmit: SubmitHandler<CreateSpace> = (params) => {
    void trigger(params);
  };
  const handleFormSubmit = handleSubmit(onSubmit);
  return (
    <FormProvider {...form}>
      <form
        className="CreateSpaceForm"
        onSubmit={(event) => {
          void handleFormSubmit(event);
        }}
      >
        <div className="p-pane flex h-full max-w-md flex-col gap-2">
          <NameField />
          <FirstChannelNameField />
          <DescriptionField />
          <DefaultDiceField />
          {creationError && <FormErrorDispay error={creationError} intl={intl} />}
        </div>
        <PaneFooterBox>
          {close && (
            <Button type="button" onClick={close}>
              <FormattedMessage defaultMessage="Cancel" />
            </Button>
          )}
          <Button variant="primary" type="submit" disabled={!form.formState.isDirty || isCreating}>
            <FormattedMessage defaultMessage="Create Space" />
          </Button>
        </PaneFooterBox>
      </form>
    </FormProvider>
  );
};
