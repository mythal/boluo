import { ApiError, Channel } from 'api';
import { post } from 'api-browser';
import { FC } from 'react';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { MutationFetcher } from 'swr/mutation';
import { Button } from 'ui';
import { useChannel } from '../../hooks/useChannel';
import { usePaneClose } from '../../hooks/usePaneClose';
import { PaneBox } from '../PaneBox';
import { ChannelNameField } from './ChannelNameField';
import { DefaultDiceField } from './DefaultDiceField';
import { ChannelSettingsForm } from './form';
import { PaneChannelSettingsHeader } from './PaneChannelSettingsHeader';
import { TopicField } from './TopicField';

interface Props {
  channelId: string;
}

const editChannel: MutationFetcher<Channel, ChannelSettingsForm, [string, string]> = async (
  [_, channelId],
  { arg: { name, defaultDiceType, topic, isPrivate } },
): Promise<Channel> => {
  const result = await post('/channels/edit', null, {
    name,
    defaultDiceType,
    topic,
    isPublic: !isPrivate,
    channelId,
    defaultRollCommand: null,
    grantMasters: [],
    removeMasters: [],
    isDocument: null,
  });
  return result.unwrap();
};

export const PaneChannelSettings: FC<Props> = ({ channelId }) => {
  const channel = useChannel(channelId);
  if (!channel) {
    throw new Error('Channel not found');
  }
  const form = useForm<ChannelSettingsForm>({
    defaultValues: {
      name: channel.name,
      defaultDiceType: channel.defaultDiceType,
      topic: channel.topic,
      defaultRollCommand: channel.defaultRollCommand,
    },
  });
  const close = usePaneClose();
  const { trigger, isMutating } = useSWRMutation<Channel, ApiError, [string, string], ChannelSettingsForm>(
    ['/channels/query', channelId],
    editChannel,
    {
      populateCache: (channel) => channel,
      revalidate: false,
    },
  );

  const onSubmit: SubmitHandler<ChannelSettingsForm> = async (data) => {
    await trigger(data);
  };

  return (
    <PaneBox header={<PaneChannelSettingsHeader channel={channel} />}>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="p-4 flex flex-col gap-4">
            <ChannelNameField />
            <DefaultDiceField />
            <TopicField />
          </div>
          <div className="p-4 flex gap-2 justify-end">
            <Button type="button" onClick={close}>
              <FormattedMessage defaultMessage="Cancel" />
            </Button>
            <Button type="submit" data-type="primary" disabled={!form.formState.isDirty || isMutating}>
              <FormattedMessage defaultMessage="Save Changes" />
            </Button>
          </div>
        </form>
      </FormProvider>
    </PaneBox>
  );
};
