import * as React from 'react';
import Select from 'react-select';
import { type Props as SelectProps } from 'react-select';
import { selectTheme, uiShadow } from '../../styles/atoms';

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

function DiceSelect({ defaultDiceType, ...rest }: Props) {
  const defaultDice = dictOptions.filter((item) => item.value === defaultDiceType);
  if (defaultDice.length === 0) {
    defaultDice.push(dictOptions[0]);
  }
  return (
    <Select
      css={[uiShadow]}
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
      theme={selectTheme}
      {...rest}
    />
  );
}

export default DiceSelect;
