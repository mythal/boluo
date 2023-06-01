import { Channel, ChannelWithMember } from 'api';
import { post } from 'api-browser';
import { channelNameValidation } from 'common/validations';
import type { FC } from 'react';
import { FormProvider, useController, useForm, useFormContext } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';
import { Button, TextInput } from 'ui';
import { usePaneClose } from '../hooks/usePaneClose';
import { usePaneReplace } from '../hooks/usePaneReplace';
import { ClosePaneButton } from './ClosePaneButton';
import { DiceSelect } from './DiceSelect';
import { PaneBox } from './PaneBox';
import { PaneFooterBox } from './PaneFooterBox';
import { PaneHeaderBox } from './PaneHeaderBox';

export interface FormSchema {
  name: string;
  spaceId: string;
  defaultDiceType: string;
  characterName: string;
  isSecret: boolean;
}

interface Props {
  spaceId: string;
}

const createChannel: MutationFetcher<ChannelWithMember, FormSchema, [string]> = async (
  _,
  { arg: { isSecret, ...payload } },
) => {
  const result = await post('/channels/create', null, { ...payload, isPublic: !isSecret });
  return result.unwrap();
};

const NameField: FC<Props> = ({ spaceId }) => {
  const { register, formState: { errors } } = useFormContext<FormSchema>();
  const intl = useIntl();
  return (
    <label className="flex flex-col">
      <div className="py-1">
        <FormattedMessage defaultMessage="Channel Name" />
      </div>
      <TextInput {...register('name', channelNameValidation(intl, spaceId))} />
      {errors.name && <div className="pt-1 text-sm text-error-700">{errors.name.message}</div>}
    </label>
  );
};

const FieldDefaultDice: FC = () => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController<FormSchema, 'defaultDiceType'>({
    name: 'defaultDiceType',
    defaultValue: 'd20',
  });
  return (
    <div>
      <label>
        <div className="py-1">
          <FormattedMessage defaultMessage="Default Dice" />
        </div>
        <DiceSelect value={value} onChange={onChange} />
      </label>
    </div>
  );
};

const CharacterNameField: FC = () => {
  const { register } = useFormContext<FormSchema>();
  const intl = useIntl();
  return (
    <label className="flex flex-col">
      <div className="py-1">
        <FormattedMessage defaultMessage="My Character Name in the Channel (Optional)" />
      </div>
      <TextInput {...register('characterName')} placeholder={intl.formatMessage({ defaultMessage: 'e.g. Gandalf' })} />
    </label>
  );
};

const PublicityField: FC = () => {
  const { register } = useFormContext<FormSchema>();
  return (
    <label className="flex items-center gap-1">
      <input type="checkbox" {...register('isSecret')} />
      <FormattedMessage defaultMessage="Is this a secret channel?" />
    </label>
  );
};

interface Props {
  spaceId: string;
}

export const PaneCreateChannel: FC<Props> = ({ spaceId }) => {
  const close = usePaneClose();
  const { mutate } = useSWRConfig();
  const replacePane = usePaneReplace();
  const form = useForm<FormSchema>({
    defaultValues: {
      name: '',
      spaceId,
      defaultDiceType: 'd20',
      characterName: '',
      isSecret: false,
    },
  });
  const { trigger, isMutating } = useSWRMutation(['/channel/create'], createChannel, {});
  const onSubmit = async (data: FormSchema) => {
    const channelWithMember = await trigger(data);
    if (channelWithMember) {
      await mutate(['/channels/by_space', spaceId]);
      replacePane({ type: 'CHANNEL', channelId: channelWithMember.channel.id });
    }
  };
  return (
    <PaneBox
      header={
        <PaneHeaderBox operators={<ClosePaneButton />}>
          <FormattedMessage defaultMessage="Create Channel" />
        </PaneHeaderBox>
      }
    >
      <div className="relative">
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="p-4 flex flex-col gap-2 h-full max-w-md">
              <NameField spaceId={spaceId} />
              <CharacterNameField />
              <PublicityField />
              <FieldDefaultDice />
            </div>
            <PaneFooterBox>
              <Button type="button" onClick={close}>
                <FormattedMessage defaultMessage="Cancel" />
              </Button>
              <Button type="submit" data-type="primary" disabled={!form.formState.isDirty || isMutating}>
                <FormattedMessage defaultMessage="Create Channel" />
              </Button>
            </PaneFooterBox>
          </form>
        </FormProvider>
      </div>
    </PaneBox>
  );
};

export default PaneCreateChannel;
