import { ChannelWithMember } from 'api';
import { post } from 'api-browser';
import type { FC } from 'react';
import { FormProvider, useController, useForm, useFormContext } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';
import { Button } from 'ui/Button';
import { TextInput } from 'ui/TextInput';
import { usePaneClose } from '../hooks/usePaneClose';
import { usePaneReplace } from '../hooks/usePaneReplace';
import { ClosePaneButton } from './ClosePaneButton';
import { ChannelNameField } from './pane-channel-settings/ChannelNameField';
import { DefaultDiceField } from './pane-channel-settings/DefaultDiceField';
import { IsPrivateField } from './pane-channel-settings/IsPrivateField';
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

const createChannel: MutationFetcher<ChannelWithMember, [string], FormSchema> = async (
  _,
  { arg: { isSecret, ...payload } },
) => {
  const result = await post('/channels/create', null, { ...payload, isPublic: !isSecret });
  return result.unwrap();
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
              <ChannelNameField spaceId={spaceId} />
              <CharacterNameField />
              <IsPrivateField />
              <DefaultDiceField />
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
