import { type ApiError, type ChannelWithMember, type Space } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { explainError } from '@boluo/locale/errors';
import { Plus } from '@boluo/icons';
import type { FC } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { FormattedMessage, type IntlShape, useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import useSWRMutation, { type MutationFetcher } from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';
import { TextInput } from '@boluo/ui/TextInput';
import { usePaneClose } from '../../hooks/usePaneClose';
import { usePaneReplace } from '../../hooks/usePaneReplace';
import { ChannelNameField } from '../pane-channel-settings/ChannelNameField';
import { DefaultDiceField } from '../pane-channel-settings/DefaultDiceField';
import { IsSecretField } from '../pane-channel-settings/IsPrivateField';
import { PaneBox } from '../PaneBox';
import { PaneFooterBox } from '../PaneFooterBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { type ChannelType } from '@boluo/api';
import { ChannelTypeField } from './ChannelTypeField';
import { useQuerySpace } from '../../hooks/useQuerySpace';
import { PaneLoading } from '../PaneLoading';
import { PaneFailed } from '../pane-failed/PaneFailed';

const FormErrorDispay: FC<{ error: ApiError; intl: IntlShape }> = ({ error, intl }) => {
  return <ErrorMessageBox>{explainError(intl, error)}</ErrorMessageBox>;
};

export interface FormSchema {
  name: string;
  spaceId: string;
  defaultDiceType: string;
  characterName: string;
  isSecret: boolean;
  type: ChannelType;
}

const key = ['/channel/create'];
const createChannel: MutationFetcher<ChannelWithMember, typeof key, FormSchema> = async (
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
      <TextInput
        {...register('characterName')}
        placeholder={intl.formatMessage({ defaultMessage: 'e.g. Gandalf' })}
      />
    </label>
  );
};

export const CreateChannelForm: FC<{ space: Space }> = ({ space }) => {
  const intl = useIntl();
  const close = usePaneClose();
  const spaceId = space.id;
  const { mutate } = useSWRConfig();
  const replacePane = usePaneReplace();
  const form = useForm<FormSchema>({
    defaultValues: {
      name: '',
      spaceId,
      defaultDiceType: space.defaultDiceType || 'd20',
      characterName: '',
      isSecret: false,
      type: 'IN_GAME',
    },
  });
  const { trigger, isMutating, error } = useSWRMutation<
    ChannelWithMember,
    ApiError,
    typeof key,
    FormSchema
  >(key, createChannel, {});
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
            <div className="p-pane flex h-full max-w-md flex-col gap-4">
              <ChannelNameField spaceId={spaceId} />
              <CharacterNameField />
              <ChannelTypeField />
              <IsSecretField />
              <DefaultDiceField />
              {error && <FormErrorDispay error={error} intl={intl} />}
            </div>
            <PaneFooterBox>
              <Button type="button" onClick={close}>
                <FormattedMessage defaultMessage="Cancel" />
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!form.formState.isDirty || isMutating}
              >
                <FormattedMessage defaultMessage="Create Channel" />
              </Button>
            </PaneFooterBox>
          </form>
        </FormProvider>
      </div>
    </PaneBox>
  );
};

export const PaneCreateChannel: FC<{
  spaceId: string;
}> = ({ spaceId }) => {
  const { data: space, isLoading, error } = useQuerySpace(spaceId);
  if (!space) {
    if (isLoading) {
      return <PaneLoading />;
    } else if (error) {
      return (
        <PaneFailed
          title={<FormattedMessage defaultMessage="Failed to load the space" />}
          code={error.code}
        />
      );
    } else {
      // Unreachable
      return null;
    }
  }
  return <CreateChannelForm space={space} />;
};

export default PaneCreateChannel;
