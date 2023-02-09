import { makeId } from 'boluo-utils';
import type { FC } from 'react';
import { FormProvider, useController, useForm, useFormContext } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button, TextInput } from 'ui';
import { post } from '../../api/browser';
import { useChatPaneDispatch, useClosePane } from '../../state/panes';
import type { ChannelPane } from '../../types/ChatPane';
import { DiceSelect } from '../DiceSelect';
import { ClosePaneButton } from './ClosePaneButton';
import { PaneBodyBox } from './PaneBodyBox';
import { PaneFooterBox } from './PaneFooterBox';
import { PaneHeaderBox } from './PaneHeaderBox';

export interface FormSchema {
  name: string;
  spaceId: string;
  defaultDiceType: string;
  characterName: string;
  isSecret: boolean;
}

const NameField: FC = () => {
  const { register, formState: { errors } } = useFormContext<FormSchema>();
  const intl = useIntl();
  const required = intl.formatMessage({ defaultMessage: 'You have to enter a channel name.' });
  return (
    <label className="flex flex-col">
      <div className="py-1">
        <FormattedMessage defaultMessage="Channel Name" />
      </div>
      <TextInput {...register('name', { required })} />
      {errors.name && <span className="text-sm text-error-700">{errors.name.message}</span>}
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
  const close = useClosePane();
  const { mutate } = useSWRConfig();
  const dispatch = useChatPaneDispatch();
  const intl = useIntl();
  const form = useForm<FormSchema>({
    defaultValues: {
      name: '',
      spaceId,
      defaultDiceType: 'd20',
      characterName: '',
      isSecret: false,
    },
  });
  const onSubmit = async ({ isSecret, ...rest }: FormSchema) => {
    const result = await post('/channels/create', null, { ...rest, isPublic: !isSecret });
    if (result.isErr) {
      const error = result.err;
      if (error.code === 'CONFLICT') {
        const message = intl.formatMessage({ defaultMessage: 'This channel name already exist.' });
        form.setError('name', { message });
      }
      // TODO: handing unexpected errors
      return;
    }
    const { channel } = result.unwrap();
    await mutate(['/channels/by_space', spaceId]);
    const newChannelPane: ChannelPane = { type: 'CHANNEL', channelId: channel.id, id: makeId() };
    dispatch({ type: 'REPLACE_PANE', item: newChannelPane });
  };
  return (
    <>
      <PaneHeaderBox operators={<ClosePaneButton />}>
        <FormattedMessage defaultMessage="Create Channel" />
      </PaneHeaderBox>
      <PaneBodyBox className="relative overflow-x-hidden overflow-y-auto">
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="p-4 flex flex-col gap-2 h-full max-w-md">
              <NameField />
              <CharacterNameField />
              <PublicityField />
              <FieldDefaultDice />
            </div>
            <PaneFooterBox>
              <Button type="button" onClick={close}>
                <FormattedMessage defaultMessage="Cancel" />
              </Button>
              <Button type="submit" data-type="primary" disabled={!form.formState.isDirty}>
                <FormattedMessage defaultMessage="Create Channel" />
              </Button>
            </PaneFooterBox>
          </form>
        </FormProvider>
      </PaneBodyBox>
    </>
  );
};
