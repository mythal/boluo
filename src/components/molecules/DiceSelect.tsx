import * as React from 'react';
import Select, { Props as SelectProps, Theme } from 'react-select';
import { bgColor, dangerColor, primaryColor, textColor, uiShadow } from '../../styles/atoms';
import { darken, mix } from 'polished';

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

const customTheme = (theme: Theme): Theme => ({
  borderRadius: 1,
  spacing: theme.spacing,
  colors: {
    primary: primaryColor,
    primary75: darken(0.3, primaryColor),
    primary50: darken(0.25, primaryColor),
    primary25: darken(0.2, primaryColor),
    danger: dangerColor,
    dangerLight: darken(0.2, dangerColor),
    neutral0: bgColor,
    neutral5: mix(0.9, bgColor, textColor),
    neutral10: mix(0.8, bgColor, textColor),
    neutral20: mix(0.7, bgColor, textColor),
    neutral30: mix(0.6, bgColor, textColor),
    neutral40: mix(0.5, bgColor, textColor),
    neutral50: mix(0.4, bgColor, textColor),
    neutral60: mix(0.3, bgColor, textColor),
    neutral70: mix(0.2, bgColor, textColor),
    neutral80: mix(0.1, bgColor, textColor),
    neutral90: textColor,
  },
});

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
      theme={customTheme}
      {...rest}
    />
  );
}

export default DiceSelect;
