import type { FC } from 'react';
import type { SelectItem } from 'ui/Select';
import { Select } from 'ui/Select';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const items: SelectItem[] = [
  { label: 'D20', value: 'd20' },
  { label: 'D100', value: 'd100' },
];

export const DiceSelect: FC<Props> = ({ value, onChange }) => {
  return <Select items={items} value={value} onChange={onChange} />;
};
