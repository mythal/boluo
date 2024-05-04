import { ApiError, Channel } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { FC } from 'react';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { MutationFetcher } from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { Loading } from '@boluo/ui/Loading';
import { usePaneClose } from '../../hooks/usePaneClose';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { DangerZone } from '../common/DangerZone';
import { ErrorDisplay } from '../ErrorDisplay';
import { PaneBox } from '../PaneBox';
import { PaneFooterBox } from '../PaneFooterBox';
import { ChannelNameField } from './ChannelNameField';
import { DefaultDiceField } from './DefaultDiceField';
import { DefaultRollCommandField } from './DefaultRollCommandField';
import { DeleteChannel } from './DeleteChannelButton';
import { ChannelSettingsForm } from './form';
import { IsSecretField } from './IsPrivateField';
import { PaneChannelSettingsHeader } from './PaneChannelSettingsHeader';
import { TopicField } from './TopicField';
import { Failed } from '../common/Failed';
import { useIsChildPane } from '../../hooks/useIsChildPane';
import { ChannelTypeField } from '../pane-create-channel/ChannelTypeField';

const channelToInitialValues = (channel: Channel): ChannelSettingsForm => ({
  name: channel.name,
  defaultDiceType: channel.defaultDiceType,
  topic: channel.topic,
  defaultRollCommand: channel.defaultRollCommand,
  isSecret: !channel.isPublic,
  type: channel.type || 'IN_GAME',
});

const PaneChannelSettingsForm: FC<{ channel: Channel }> = ({ channel }) => {
  const form = useForm<ChannelSettingsForm>({
    defaultValues: channelToInitialValues(channel),
  });

  const closePane = usePaneClose();

  const key = ['/channels/query', channel.id] as const;
  const editChannel: MutationFetcher<Channel, typeof key, ChannelSettingsForm> = async (
    [_, channelId],
    { arg: { name, defaultDiceType, defaultRollCommand, topic, isSecret, type } },
  ): Promise<Channel> => {
    const result = await post('/channels/edit', null, {
      name,
      defaultDiceType,
      topic,
      isPublic: !isSecret,
      channelId,
      defaultRollCommand,
      grantMasters: [],
      removeMasters: [],
      isDocument: null,
      type,
    });
    return result.unwrap();
  };
  const { trigger, error } = useSWRMutation<Channel, ApiError, typeof key, ChannelSettingsForm>(
    ['/channels/query', channel.id],
    editChannel,
    {
      onSuccess: (channel: Channel) => {
        form.reset(channelToInitialValues(channel));
      },
      populateCache: (channel) => channel,
      revalidate: false,
    },
  );

  const onSubmit: SubmitHandler<ChannelSettingsForm> = async (data) => {
    await trigger(data);
    close();
  };

  return (
    <FormProvider {...form}>
      {error && (
        <div className="px-pane py-2">
          <ErrorDisplay type="banner" error={error} />
        </div>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="p-pane flex max-w-md flex-col gap-4">
          <ChannelNameField spaceId={channel.spaceId} channelName={channel.name} />
          <ChannelTypeField />
          <DefaultDiceField />
          <DefaultRollCommandField />
          <TopicField />
          <IsSecretField />

          <div className="font-bold">
            <FormattedMessage defaultMessage="Danger Zone" />
          </div>
          <DangerZone
            prompt={
              <span className="text-lg">
                <FormattedMessage defaultMessage="Delete Channel" />
              </span>
            }
          >
            <div className="py-2">
              <DeleteChannel channelId={channel.id} channelName={channel.name} />
            </div>
          </DangerZone>
        </div>
        <PaneFooterBox>
          <Button type="button" onClick={closePane}>
            <FormattedMessage defaultMessage="Cancel" />
          </Button>
          <Button type="submit" data-type="primary" disabled={!form.formState.isDirty || form.formState.isSubmitting}>
            <FormattedMessage defaultMessage="Save Changes" />
          </Button>
        </PaneFooterBox>
      </form>
    </FormProvider>
  );
};

export const PaneChannelSettings: FC<{ channelId: string }> = ({ channelId }) => {
  const { data: channel, error } = useQueryChannel(channelId);
  const isChild = useIsChildPane();

  if (error && channel == null) {
    return <Failed error={error} title={<FormattedMessage defaultMessage="Failed to query the channel" />} />;
  } else if (!channel) {
    return <Loading />;
  }

  return (
    <PaneBox header={isChild ? null : <PaneChannelSettingsHeader channel={channel} />}>
      <PaneChannelSettingsForm channel={channel} />
    </PaneBox>
  );
};
