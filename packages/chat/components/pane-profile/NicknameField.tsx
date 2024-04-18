import { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { TextInput } from '@boluo/ui/TextInput';
import { ProfileEditSchema } from './PaneProfileEdit';

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
    <div>
      <TextInput
        defaultValue={nickname}
        {...register('nickname', {
          required: intl.formatMessage({ defaultMessage: "Can't be empty." }),
        })}
      ></TextInput>

      {errors.nickname && <div className="text-error-600 py-1 text-sm">{errors.nickname.message}</div>}
    </div>
  );
};
