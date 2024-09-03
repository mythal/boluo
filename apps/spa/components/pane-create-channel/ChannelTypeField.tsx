import { type ChannelType } from '@boluo/api';
import { type FC } from 'react';
import { useController } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { SelectBox } from '@boluo/ui/SelectBox';

export const ChannelTypeField: FC = () => {
  const {
    field: { onChange, value: type },
  } = useController<{ type: ChannelType }>({ name: 'type' });
  return (
    <div className="flex flex-col gap-2">
      <SelectBox
        title={<FormattedMessage defaultMessage="In Game" />}
        description={
          <FormattedMessage defaultMessage="The channel where the game is played. By default member will speak as a character." />
        }
        selected={type === 'IN_GAME'}
        onSelected={() => onChange('IN_GAME')}
      />

      <SelectBox
        title={<FormattedMessage defaultMessage="Out of Game" />}
        description={<FormattedMessage defaultMessage="By default member will speak on their own behalf." />}
        selected={type === 'OUT_OF_GAME'}
        onSelected={() => onChange('OUT_OF_GAME')}
      />
    </div>
  );
};
