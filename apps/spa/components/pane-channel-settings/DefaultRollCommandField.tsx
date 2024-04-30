import { FC, useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { HelpText } from '@boluo/ui/HelpText';
import { TextInput } from '@boluo/ui/TextInput';
import { ChannelSettingsForm } from './form';

interface Props {}

export const DefaultRollCommandField: FC<Props> = ({}) => {
  const id = useId();
  const { register } = useFormContext<ChannelSettingsForm>();
  return (
    <div>
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Default Roll Command" />
      </label>
      <div>
        <TextInput id={id} {...register('defaultRollCommand')} />
      </div>
      <div className="pt-1">
        <HelpText>
          <FormattedMessage defaultMessage="The command that will be inserted when the button is pressed." />
        </HelpText>
      </div>
    </div>
  );
};
