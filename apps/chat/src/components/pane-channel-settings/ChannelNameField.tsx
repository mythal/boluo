import { useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { TextInput } from 'ui';
import { ChannelSettingsForm } from './form';

export const ChannelNameField = () => {
  const { register } = useFormContext<ChannelSettingsForm>();
  const id = useId();
  return (
    <div>
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Channel Name" />
      </label>
      <div>
        <TextInput id={id} {...register('name')} />
      </div>
    </div>
  );
};
