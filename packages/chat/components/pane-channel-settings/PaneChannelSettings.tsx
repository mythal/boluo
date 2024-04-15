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

interface Props {
  channelId: string;
}

const PaneChannelSettingsForm: FC<{ channel: Channel }> = ({ channel }) => {
  const form = useForm<ChannelSettingsForm>({
    defaultValues: {
      name: channel.name,
      defaultDiceType: channel.defaultDiceType,
      topic: channel.topic,
      defaultRollCommand: channel.defaultRollCommand,
      isSecret: !channel.isPublic,
    },
  });

  const close = usePaneClose();

  const key = ['/channels/query', channel.id] as const;
  const editChannel: MutationFetcher<Channel, typeof key, ChannelSettingsForm> = async (
    [_, channelId],
    { arg: { name, defaultDiceType, topic, isSecret } },
  ): Promise<Channel> => {
    const result = await post('/channels/edit', null, {
      name,
      defaultDiceType,
      topic,
      isPublic: !isSecret,
      channelId,
      defaultRollCommand: null,
      grantMasters: [],
      removeMasters: [],
      isDocument: null,
    });
    return result.unwrap();
  };
  const { trigger, error } = useSWRMutation<Channel, ApiError, typeof key, ChannelSettingsForm>(
    ['/channels/query', channel.id],
    editChannel,
    {
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
        <div className="p-pane flex flex-col gap-4">
          <ChannelNameField spaceId={channel.spaceId} channelName={channel.name} />
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
          <Button type="button" onClick={close}>
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

export const PaneChannelSettings: FC<Props> = ({ channelId }) => {
  const { data: channel, error } = useQueryChannel(channelId);

  if (error && channel == null) {
    return <Failed error={error} title={<FormattedMessage defaultMessage="Failed to query the channel" />} />;
  } else if (!channel) {
    return <Loading />;
  }

  return (
    <PaneBox header={<PaneChannelSettingsHeader channel={channel} />}>
      <PaneChannelSettingsForm channel={channel} />
    </PaneBox>
  );
};
