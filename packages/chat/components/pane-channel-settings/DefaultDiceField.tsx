import { FC, useId } from 'react';
import { useController } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { HelpText } from 'ui/HelpText';
import { DiceSelect } from '../DiceSelect';

interface Props {
}

export const DefaultDiceField: FC<Props> = ({}) => {
  const id = useId();
  const { field: { value, onChange } } = useController<{ defaultDiceType: string }>({
    name: 'defaultDiceType',
    defaultValue: 'd20',
  });
  return (
    <div>
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Default Dice" />
      </label>

      <DiceSelect id={id} value={value} onChange={onChange} />
      <div className="pt-1">
        <HelpText>
          <FormattedMessage defaultMessage="When you type 1{value}, you can simplify it to 1d." values={{ value }} />
        </HelpText>
      </div>
    </div>
  );
};
