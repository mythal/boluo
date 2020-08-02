import * as React from 'react';
import { Props as SelectProps } from 'react-select';
import { selectTheme, uiShadow } from '@/styles/atoms';

const Select = React.lazy(() => import('react-select'));

interface Props extends Omit<SelectProps, 'options'> {
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
        { value: 'd6', label: 'D6' },
      ]}
      theme={selectTheme}
      {...rest}
    />
  );
}

export default DiceSelect;
