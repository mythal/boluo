import { FC, useId } from 'react';
import { Controller } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { DiceSelect } from '../DiceSelect';
import { ChannelSettingsForm } from './form';

interface Props {
}

export const DefaultDiceField: FC<Props> = ({}) => {
  const id = useId();
  return (
    <div>
      <label className="block pb-1" htmlFor={id}>
        <FormattedMessage defaultMessage="Default Dice" />
      </label>

      <Controller<Pick<ChannelSettingsForm, 'defaultDiceType'>>
        name="defaultDiceType"
        render={({ field: { value, onChange } }) => <DiceSelect id={id} value={value} onChange={onChange} />}
      />
    </div>
  );
};
