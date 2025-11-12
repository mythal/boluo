import { type FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { HelpText } from '@boluo/ui/HelpText';
import { type FormSchema } from '../pane-create-channel/PaneCreateChannel';

export const IsSecretField: FC = () => {
  const { register } = useFormContext<FormSchema, 'isSecret'>();
  return (
    <div className="IsSecretField">
      <label className="grid grid-cols-[auto_1fr] grid-rows-2 items-center gap-x-2">
        <input type="checkbox" {...register('isSecret')} />
        <FormattedMessage defaultMessage="Is secret channel?" />

        <div className="col-start-2">
          <HelpText>
            <FormattedMessage defaultMessage="Secret channels are only accessible by invitation." />
          </HelpText>
        </div>
      </label>
    </div>
  );
};
