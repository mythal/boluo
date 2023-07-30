import { ApiError, Channel } from 'api';
import { post } from 'api-browser';
import { FC } from 'react';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { MutationFetcher } from 'swr/mutation';
import { Button } from 'ui/Button';
import { Loading } from 'ui/Loading';
import { useChannel } from '../../hooks/useChannel';
import { usePaneClose } from '../../hooks/usePaneClose';
import { PaneBox } from '../PaneBox';
import { PaneFooterBox } from '../PaneFooterBox';
import { ChannelNameField } from './ChannelNameField';
import { DefaultDiceField } from './DefaultDiceField';
import { DefaultRollCommandField } from './DefaultRollCommandField';
import { DeleteChannelButton } from './DeleteChannelButton';
import { ChannelSettingsForm } from './form';
import { IsPrivateField } from './IsPrivateField';
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

const PaneChannelSettingsForm: FC<{ channel: Channel }> = ({ channel }) => {
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
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="p-4 flex flex-col gap-4">
          <ChannelNameField spaceId={channel.spaceId} channelName={channel.name} />
          <DefaultDiceField />
          <DefaultRollCommandField />
          <TopicField />
          <IsPrivateField />
          <div className="p-2 border-t border-b border-error-200 bg-error-50">
            <div className="text-lg">
              <FormattedMessage defaultMessage="Danger Zone" />
            </div>
            <div>
              <div className="py-2">
                <DeleteChannelButton channelId={channel.id} channelName={channel.name} />
              </div>
            </div>
          </div>
        </div>
        <PaneFooterBox>
          <Button type="button" onClick={close}>
            <FormattedMessage defaultMessage="Cancel" />
          </Button>
          <Button
            type="submit"
            data-type="primary"
            disabled={!form.formState.isDirty || isMutating}
          >
            <FormattedMessage defaultMessage="Save Changes" />
          </Button>
        </PaneFooterBox>
      </form>
    </FormProvider>
  );
};

export const PaneChannelSettings: FC<Props> = ({ channelId }) => {
  const { data: channel } = useChannel(channelId);

  if (!channel) {
    return <Loading />;
  }

  return (
    <PaneBox header={<PaneChannelSettingsHeader channel={channel} />}>
      <PaneChannelSettingsForm channel={channel} />
    </PaneBox>
  );
};
