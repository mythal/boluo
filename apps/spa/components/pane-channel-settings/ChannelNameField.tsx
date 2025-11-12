import { channelNameValidation } from '@boluo/common/validations';
import { type FC, useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { TextInput } from '@boluo/ui/TextInput';

interface Props {
  spaceId: string;
  channelName?: string;
}

export const ChannelNameField: FC<Props> = ({ spaceId, channelName }) => {
  const {
    register,
    formState: { errors },
  } = useFormContext<{ name: string }>();
  const intl = useIntl();
  const id = useId();
  return (
    <div className="ChannelNameField">
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Channel Name" />
      </label>
      <div>
        <TextInput
          className="w-full"
          id={id}
          {...register('name', channelNameValidation(intl, spaceId, channelName))}
        />
      </div>
      {errors.name && (
        <div className="text-state-danger-text pt-1 text-sm">{errors.name.message}</div>
      )}
    </div>
  );
};
