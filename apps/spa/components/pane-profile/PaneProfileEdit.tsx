import type { ApiError, User } from '@boluo/api';
import { editAvatar, post } from '@boluo/api-browser';
import { type FC } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { upload } from '../../media';
import { ErrorDisplay } from '../ErrorDisplay';
import { PaneFooterBox } from '../PaneFooterBox';
import { BioField } from './BioField';
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
  bio: string;
}

export const PaneProfileEdit: FC<Props> = ({ me, onSuccess }) => {
  const form = useForm<ProfileEditSchema>({
    defaultValues: { nickname: me.nickname, avatar: me.avatarId, bio: me.bio },
  });
  const { mutate } = useSWRConfig();
  const key = ['/users/query', null] as const;
  const {
    trigger: editUser,
    error,
    isMutating,
  } = useSWRMutation<User, ApiError, typeof key, ProfileEditSchema>(
    key,
    async (_, { arg: { avatar, nickname, bio } }) => {
      let avatarId: string | null | undefined = undefined;

      if (avatar instanceof File) {
        await editAvatar(avatar);
        const uploadResult = await upload(avatar);
        const media = uploadResult.unwrap();
        avatarId = media.mediaId;
      } else if (avatar == null && me.avatarId) {
        const result = await post('/users/remove_avatar', null, null);
        result.unwrap();
      }
      if (nickname !== me.nickname) {
        nickname = nickname.trim();
      }

      const editResult = await post('/users/edit', null, { nickname, avatar: avatarId, bio });
      editResult.unwrap();
      return editResult.unwrap();
    },
    {
      onSuccess: () => {
        void mutate(['/users/query', null]);
        void mutate(['/users/query', me.id]);
        onSuccess();
      },
    },
  );
  const handleFormSubmit = form.handleSubmit((formData) => void editUser(formData));
  const disabled = !form.formState.isDirty || isMutating;
  return (
    <FormProvider {...form}>
      {error && (
        <div className="px-pane py-2">
          <ErrorDisplay error={error} type="banner" />
        </div>
      )}
      <form
        onSubmit={(event) => {
          void handleFormSubmit(event);
        }}
      >
        <div className="p-pane">
          <div className="group pb-12">
            <Controller<ProfileEditSchema>
              name="avatar"
              render={({ field: { onChange, value } }) => (
                <EditAvatar userId={me.id} avatar={value} onChange={onChange} />
              )}
            />
            <div className="flex flex-col gap-2 pr-4">
              <ShowUsername username={me.username} />
              <NicknameField nickname={me.nickname || ''} />
              <BioField className="min-h-32 max-w-md" />
            </div>
          </div>
          <div className="text-text-muted">
            <FormattedMessage defaultMessage="You can change default message color in the Settings." />
          </div>
        </div>

        <PaneFooterBox>
          <Button type="button" onClick={onSuccess}>
            <FormattedMessage defaultMessage="Cancel" />
          </Button>
          <Button type="submit" variant="primary" disabled={disabled}>
            <FormattedMessage defaultMessage="Save Changes" />
          </Button>
        </PaneFooterBox>
      </form>
    </FormProvider>
  );
};
