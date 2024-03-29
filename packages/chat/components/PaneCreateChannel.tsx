import { ApiError, ChannelWithMember } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { useErrorExplain } from '@boluo/common';
import { Plus } from '@boluo/icons';
import type { FC } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import useSWRMutation, { MutationFetcher } from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';
import { TextInput } from '@boluo/ui/TextInput';
import { usePaneClose } from '../hooks/usePaneClose';
import { usePaneReplace } from '../hooks/usePaneReplace';
import { ChannelNameField } from './pane-channel-settings/ChannelNameField';
import { DefaultDiceField } from './pane-channel-settings/DefaultDiceField';
import { IsSecretField } from './pane-channel-settings/IsPrivateField';
import { PaneBox } from './PaneBox';
import { PaneFooterBox } from './PaneFooterBox';
import { PaneHeaderBox } from './PaneHeaderBox';

const FormErrorDispay: FC<{ error: ApiError }> = ({ error }) => {
  const explain = useErrorExplain();
  return <ErrorMessageBox>{explain(error)}</ErrorMessageBox>;
};

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

const key = ['/channel/create'];
const createChannel: MutationFetcher<ChannelWithMember, FormSchema, typeof key> = async (
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
  const { trigger, isMutating, error } = useSWRMutation<ChannelWithMember, ApiError, typeof key, FormSchema>(
    key,
    createChannel,
    {},
  );
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
        <PaneHeaderBox icon={<Plus />}>
          <FormattedMessage defaultMessage="Create Channel" />
        </PaneHeaderBox>
      }
    >
      <div className="relative">
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex h-full max-w-md flex-col gap-2 p-4">
              <ChannelNameField spaceId={spaceId} />
              <CharacterNameField />
              <IsSecretField />
              <DefaultDiceField />
              {error && <FormErrorDispay error={error} />}
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
