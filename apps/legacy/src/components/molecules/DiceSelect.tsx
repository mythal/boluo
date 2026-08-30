import * as React from 'react';
import Select from 'react-select';
import { type Props as SelectProps } from 'react-select';
import { reactSelectTheme } from '../../styles/reactSelectTheme';
import { cls } from '../../utils/classnames';

interface Props extends Omit<SelectProps<DiceOption, false>, 'options'> {
  defaultDiceType?: string;
}

export interface DiceOption {
  value: string;
  label: string;
}

export const dictOptions: DiceOption[] = [
  { value: 'd20', label: 'D20' },
  { value: 'd100', label: 'D100' },
  { value: 'd6', label: 'D6' },
];

function DiceSelect({ className, defaultDiceType, ...rest }: Props) {
  const defaultDice = dictOptions.filter((item) => item.value === defaultDiceType);
  if (defaultDice.length === 0) {
    defaultDice.push(dictOptions[0]);
  }
  return (
    <Select
      className={cls('shadow-legacy-ui', className)}
      defaultValue={defaultDice}
      options={[
        { value: 'd20', label: 'D20' },
        { value: 'd100', label: 'D100' },
        { value: 'd10', label: 'D10' },
        { value: 'd12', label: 'D12' },
        { value: 'd8', label: 'D8' },
        { value: 'd6', label: 'D6' },
        { value: 'd4', label: 'D4' },
      ]}
      theme={reactSelectTheme}
      {...rest}
    />
  );
}

export default DiceSelect;
