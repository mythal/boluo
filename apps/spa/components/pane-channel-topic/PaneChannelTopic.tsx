import { type ApiError, type Channel } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { Edit } from '@boluo/icons';
import { type FC } from 'react';
import { FormProvider, type SubmitHandler, useForm } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import useSWRMutation, { type MutationFetcher } from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { Loading } from '@boluo/ui/Loading';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { PaneFooterBox } from '../PaneFooterBox';
import { TopicField } from '../pane-channel-settings/TopicField';
import { ErrorDisplay } from '../ErrorDisplay';
import { useQueryChannel } from '@boluo/hooks/useQueryChannel';
import { usePaneClose } from '../../hooks/usePaneClose';
import { Failed } from '@boluo/ui/Failed';

interface ChannelTopicForm {
  topic: string;
}

const channelToInitialValues = (channel: Channel): ChannelTopicForm => ({
  topic: channel.topic,
});

const PaneChannelTopicForm: FC<{ channel: Channel }> = ({ channel }) => {
  const form = useForm<ChannelTopicForm>({
    defaultValues: channelToInitialValues(channel),
  });
  const closePane = usePaneClose();
  const key = ['/channels/query', channel.id] as const;

  const editTopic: MutationFetcher<Channel, typeof key, ChannelTopicForm> = async (
    [_, channelId],
    { arg },
  ): Promise<Channel> => {
    const result = await post('/channels/edit_topic', null, {
      channelId,
      topic: arg.topic,
    });
    return result.unwrap();
  };

  const { trigger, error } = useSWRMutation<Channel, ApiError, typeof key, ChannelTopicForm>(
    key,
    editTopic,
    {
      onSuccess: (updatedChannel) => {
        form.reset(channelToInitialValues(updatedChannel));
      },
      populateCache: (updatedChannel) => updatedChannel,
      revalidate: false,
    },
  );

  const onSubmit: SubmitHandler<ChannelTopicForm> = async (data) => {
    await trigger(data);
    closePane();
  };

  return (
    <FormProvider {...form}>
      {error && (
        <div className="px-pane py-2">
          <ErrorDisplay type="banner" error={error} />
        </div>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="p-pane max-w-md space-y-4">
          <TopicField />
        </div>
        <PaneFooterBox>
          <Button type="button" onClick={closePane}>
            <FormattedMessage defaultMessage="Cancel" />
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!form.formState.isDirty || form.formState.isSubmitting}
          >
            <FormattedMessage defaultMessage="Save Topic" />
          </Button>
        </PaneFooterBox>
      </form>
    </FormProvider>
  );
};

export const PaneChannelTopic: FC<{ channelId: string }> = ({ channelId }) => {
  const { data: channel, error } = useQueryChannel(channelId);
  if (error && channel == null) {
    return (
      <Failed
        code={error.code}
        title={<FormattedMessage defaultMessage="Failed to query the channel" />}
      />
    );
  } else if (!channel) {
    return <Loading />;
  }

  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<Edit />}>
          <FormattedMessage defaultMessage="Edit Topic" />
        </PaneHeaderBox>
      }
    >
      <PaneChannelTopicForm channel={channel} />
    </PaneBox>
  );
};
