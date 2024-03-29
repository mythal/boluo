import { useMe } from '@boluo/common';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { TextInput } from '@boluo/ui/TextInput';
import { ProfileEditSchema } from './PaneProfileEdit';

interface Props {}

export const NicknameField: FC<Props> = () => {
  const me = useMe();
  const intl = useIntl();
  const {
    register,
    formState: { errors },
  } = useFormContext<ProfileEditSchema>();
  if (me === 'LOADING' || me == null) {
    console.error('Unexpected null me in NicknameField.');
    return null;
  }
  return (
    <div>
      <TextInput
        defaultValue={me?.user.nickname ?? ''}
        {...register('nickname', {
          required: intl.formatMessage({ defaultMessage: "Can't be empty." }),
        })}
      ></TextInput>

      {errors.nickname && <div className="text-error-600 py-1 text-sm">{errors.nickname.message}</div>}
    </div>
  );
};
