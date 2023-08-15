import { ApiError, ChannelMember } from 'api';
import { post } from 'api-browser';
import { FC, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { Button } from 'ui/Button';
import { TextInput } from 'ui/TextInput';

interface Props {
  member: ChannelMember;
  exitEdit?: () => void;
}

interface FormSchema {
  characterName: string;
}

export const ChannelHeaderCharacterNameEdit: FC<Props> = ({ member, exitEdit }) => {
  const id = useId();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormSchema>({
    defaultValues: { characterName: member.characterName },
  });
  const key = ['/channels/members', member.channelId] as const;
  const { trigger } = useSWRMutation<ChannelMember, ApiError, typeof key, FormSchema>(
    key,
    async ([, channelId], { arg: { characterName } }) => {
      const result = await post('/channels/edit_member', null, { channelId, characterName, textColor: null });
      return result.unwrap();
    },
    {
      onSuccess: exitEdit,
    },
  );
  const save = (formData: FormSchema) => {
    void trigger(formData);
  };
  return (
    <form className="" onSubmit={handleSubmit(save)}>
      <label className="" htmlFor={id}>
        <FormattedMessage defaultMessage="Character Name" />
      </label>
      <div className="flex gap-1">
        <TextInput id={id} {...register('characterName')} />

        <Button type="submit" data-type="primary" disabled={isSubmitting}>
          <FormattedMessage defaultMessage="Save" />
        </Button>
        <Button type="button" onClick={exitEdit}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
      </div>
    </form>
  );
};
