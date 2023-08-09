import { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { HelpText } from 'ui/HelpText';
import { FormSchema } from '../PaneCreateChannel';

interface Props {}

export const IsSecretField: FC<Props> = () => {
  const { register } = useFormContext<FormSchema, 'isSecret'>();
  return (
    <div>
      <label className="grid grid-rows-2 grid-cols-[auto_1fr] gap-x-2 items-center">
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
