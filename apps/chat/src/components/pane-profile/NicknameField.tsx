import { useMe } from 'common';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { TextInput } from 'ui';
import { ProfileEditSchema } from './PaneProfileEdit';

interface Props {
}

export const NicknameField: FC<Props> = () => {
  const me = useMe();
  const intl = useIntl();
  const { register, formState: { errors } } = useFormContext<ProfileEditSchema>();
  return (
    <div>
      <TextInput
        defaultValue={me?.user.nickname ?? ''}
        {...register('nickname', {
          required: intl.formatMessage({ defaultMessage: "Can't be empty." }),
        })}
      >
      </TextInput>

      {errors.nickname && <div className="text-sm py-1 text-error-600">{errors.nickname.message}</div>}
    </div>
  );
};