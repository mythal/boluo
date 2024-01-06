import { ChannelMember } from 'api';
import { FC, useId } from 'react';
import { useForm } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { TextInput } from 'ui/TextInput';
import { useEditChannelCharacterName } from '../../hooks/useEditChannelCharacterName';

interface Props {
  member: ChannelMember;
  exitEdit?: () => void;
}

interface FormSchema {
  characterName: string;
}

export const ChannelHeaderCharacterNameEdit: FC<Props> = ({ member, exitEdit }) => {
  const id = useId();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormSchema>({
    defaultValues: { characterName: member.characterName },
  });
  const { trigger } = useEditChannelCharacterName(member.channelId, { onSuccess: exitEdit });
  const save = (formData: FormSchema) => {
    void trigger(formData);
  };
  return (
    <form className="" onSubmit={handleSubmit(save)}>
      <label className="py-1 block" htmlFor={id}>
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
