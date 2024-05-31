import { type ChannelType } from '@boluo/api';
import { type FC, type ReactNode } from 'react';
import { useController } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';

const ChannelTypeSelectBox: FC<{
  title: ReactNode;
  description: ReactNode;
  selected: boolean;
  onSelected: () => void;
}> = ({ title, description, selected, onSelected }) => {
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.checked) {
      onSelected();
    }
  };
  return (
    <label
      className={`${selected ? 'bg-selectBox-active-bg' : 'bg-selectBox-bg hover:bg-selectBox-hover-bg'} grid grid-cols-[1rem_auto] gap-x-2 gap-y-1 rounded px-4 py-2`}
    >
      <div className="self-center">
        <input type="radio" checked={selected} onChange={handleChange} className="block h-4 w-4" />
      </div>
      <div className="font-bold">{title}</div>
      <div className="text-text-light col-start-2 text-sm">{description}</div>
    </label>
  );
};

export const ChannelTypeField: FC = () => {
  const {
    field: { onChange, value: type },
  } = useController<{ type: ChannelType }>({ name: 'type' });
  return (
    <div className="flex flex-col gap-2">
      <ChannelTypeSelectBox
        title={<FormattedMessage defaultMessage="In Game" />}
        description={
          <FormattedMessage defaultMessage="The channel where the game is played. By default member will speak as a character." />
        }
        selected={type === 'IN_GAME'}
        onSelected={() => onChange('IN_GAME')}
      />

      <ChannelTypeSelectBox
        title={<FormattedMessage defaultMessage="Out of Game" />}
        description={<FormattedMessage defaultMessage="By default member will speak on their own behalf." />}
        selected={type === 'OUT_OF_GAME'}
        onSelected={() => onChange('OUT_OF_GAME')}
      />
    </div>
  );
};
