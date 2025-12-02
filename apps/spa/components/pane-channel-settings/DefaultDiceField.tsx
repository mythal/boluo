import { type FC, useId } from 'react';
import { useController } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { HelpText } from '@boluo/ui/HelpText';
import { DiceSelect } from '@boluo/ui/DiceSelect';

export const DEFAULT_DICE_TYPE = 'd20';

export const DefaultDiceField: FC = () => {
  const id = useId();
  const {
    field: { value, onChange },
  } = useController<{ defaultDiceType: string }>({
    name: 'defaultDiceType',
    defaultValue: DEFAULT_DICE_TYPE,
  });
  return (
    <div className="DefaultDiceField">
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Default Dice" />
      </label>

      <DiceSelect id={id} value={value ?? DEFAULT_DICE_TYPE} onChange={onChange} />
      <div className="pt-1">
        <HelpText>
          <FormattedMessage
            defaultMessage="When you type 1{value}, you can simplify it to 1d."
            values={{ value: value ?? DEFAULT_DICE_TYPE }}
          />
        </HelpText>
      </div>
    </div>
  );
};
