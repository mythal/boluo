import { type FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { HelpText } from '@boluo/ui/HelpText';
import { type ChannelSettingsForm } from './form';

export const IsArchivedField: FC = () => {
  const { register } = useFormContext<ChannelSettingsForm>();

  return (
    <div className="IsArchivedField">
      <label className="grid grid-cols-[auto_1fr] grid-rows-2 items-center gap-x-2">
        <input type="checkbox" {...register('isArchived')} />
        <FormattedMessage defaultMessage="Archive this channel" />

        <div className="col-start-2">
          <HelpText>
            <FormattedMessage defaultMessage="Archived channels are hidden from the list by default." />
          </HelpText>
        </div>
      </label>
    </div>
  );
};
