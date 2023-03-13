import { editAvatar, User } from 'api';
import { useApiUrl, usePost } from 'common';
import { FC, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import { Button } from 'ui';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { PaneFooterBox } from '../PaneFooterBox';
import { EditAvatar } from './EditAvatar';
import { NicknameField } from './NicknameField';
import { ShowUsername } from './ShowUsername';

interface Props {
  me: User;
  exit: () => void;
}

export interface ProfileEditSchema {
  nickname: string;
  avatar: File | string | null;
}

export const PaneProfileEdit: FC<Props> = ({ me, exit }) => {
  const form = useForm<ProfileEditSchema>({ defaultValues: { nickname: me.nickname, avatar: me.avatarId } });
  const post = usePost();
  const { mutate } = useSWRConfig();
  const baseUrl = useApiUrl();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const alert = useErrorAlert();
  const onSubmit = async ({ avatar, nickname }: ProfileEditSchema) => {
    setIsSubmitting(true);
    if (avatar instanceof File) {
      await editAvatar(baseUrl, avatar);
    } else if (avatar === null && me.avatarId) {
      (await post('/users/remove_avatar', null, null)).mapErr(alert);
    }
    if (nickname !== me.nickname) {
      (await post('/users/edit', null, { nickname })).mapErr(alert);
    }
    await mutate('/users/get_me');
    await mutate(['/users/query', me.id]);
    exit();
  };
  const disabled = !form.formState.isDirty || isSubmitting;
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="p-4">
          <div className="group pb-12">
            <Controller<ProfileEditSchema>
              name="avatar"
              render={({ field: { onChange, value } }) => (
                <EditAvatar userId={me.id} avatar={value} onChange={onChange} />
              )}
            />
            <div>
              <ShowUsername username={me.username} />
              <NicknameField />
            </div>
          </div>
        </div>

        <PaneFooterBox>
          <Button type="button" onClick={exit}>
            <FormattedMessage defaultMessage="Cancel" />
          </Button>
          <Button type="submit" data-type="primary" disabled={disabled}>
            <FormattedMessage defaultMessage="Save Changes" />
          </Button>
        </PaneFooterBox>
      </form>
    </FormProvider>
  );
};
