import { type FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { TextInput } from '@boluo/ui/TextInput';
import { type ProfileEditSchema } from './PaneProfileEdit';

interface Props {
  nickname: string;
}

export const NicknameField: FC<Props> = ({ nickname }) => {
  const intl = useIntl();
  const {
    register,
    formState: { errors },
  } = useFormContext<ProfileEditSchema>();
  return (
    <div className="">
      <TextInput
        defaultValue={nickname}
        {...register('nickname', {
          required: intl.formatMessage({ defaultMessage: "Can't be empty." }),
        })}
        className="max-w-full"
      ></TextInput>

      {errors.nickname && (
        <div className="text-state-danger-text py-1 text-sm">{errors.nickname.message}</div>
      )}
    </div>
  );
};
