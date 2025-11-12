import { type FC, useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { HelpText } from '@boluo/ui/HelpText';
import { TextArea } from '@boluo/ui/TextInput';

export const TopicField: FC = () => {
  const { register } = useFormContext();
  const id = useId();
  const intl = useIntl();
  const placeholder = intl.formatMessage({
    defaultMessage: 'e.g. A group of kobolds tried to attack us',
  });

  return (
    <div className="TopicField">
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Topic" />
      </label>
      <div>
        <TextArea className="w-full" id={id} {...register('topic')} placeholder={placeholder} />
      </div>
      <HelpText>
        <FormattedMessage defaultMessage="Topics can be used to record and remind you of what you are currently focused on." />
      </HelpText>
    </div>
  );
};
