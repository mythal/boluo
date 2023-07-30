import type { ApiError, User } from 'api';
import { editAvatar, post } from 'api-browser';
import { FC, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import { Button } from 'ui/Button';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { upload } from '../../media';
import { ErrorDisplay } from '../ErrorDisplay';
import { PaneFooterBox } from '../PaneFooterBox';
import { EditAvatar } from './EditAvatar';
import { NicknameField } from './NicknameField';
import { ShowUsername } from './ShowUsername';

interface Props {
  me: User;
  onSuccess: () => void;
}

export interface ProfileEditSchema {
  nickname: string;
  avatar: File | string | null;
}

export const PaneProfileEdit: FC<Props> = ({ me, onSuccess }) => {
  const form = useForm<ProfileEditSchema>({ defaultValues: { nickname: me.nickname, avatar: me.avatarId } });
  const { mutate } = useSWRConfig();
  const key = ['/users/get_me'] as const;
  const { trigger: editUser, isMutating: isSubmitting, error } = useSWRMutation<
    User,
    ApiError,
    typeof key,
    ProfileEditSchema
  >(
    key,
    async (_, { arg: { avatar, nickname } }) => {
      let avatarId: string | null | undefined = undefined;

      if (avatar instanceof File) {
        await editAvatar(avatar);
        const uploadResult = await upload(avatar);
        const media = uploadResult.unwrap();
        avatarId = media.mediaId;
      } else if (avatar === null && me.avatarId) {
        const result = await post('/users/remove_avatar', null, null);
        result.unwrap();
      }
      if (nickname !== me.nickname) {
        nickname = nickname.trim();
      }

      const editResult = await post('/users/edit', null, { nickname, avatar: avatarId });
      editResult.unwrap();
      return editResult.unwrap();
    },
    {
      onSuccess: async () => {
        await mutate(['/users/get_me']);
        await mutate(['/users/query', me.id]);
        onSuccess();
      },
    },
  );
  const disabled = !form.formState.isDirty || isSubmitting;
  return (
    <FormProvider {...form}>
      {error && (
        <div className="py-2 px-4">
          <ErrorDisplay error={error} type="banner" />
        </div>
      )}
      <form onSubmit={form.handleSubmit((formData) => editUser(formData))}>
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
          <Button type="button" onClick={onSuccess}>
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
