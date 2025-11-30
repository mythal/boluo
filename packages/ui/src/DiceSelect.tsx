'use client';
import type { FC } from 'react';
import { Select } from './Select';
import { TextInput } from './TextInput';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}

const items = [
  { label: 'D6', value: 'd6' },
  { label: 'D8', value: 'd8' },
  { label: 'D10', value: 'd10' },
  { label: 'D20', value: 'd20' },
  { label: 'D100', value: 'd100' },
  { label: 'Custom', value: 'custom' },
];

const getSelectValue = (value: string): string => {
  const predefined = items.find((item) => item.value === value && value !== 'custom');
  return predefined ? value : 'custom';
};

const getCustomNumber = (value: string): number => {
  if (value === 'custom') return 4;
  const match = value.match(/^d(\d+)$/);
  return match?.[1] ? parseInt(match[1], 10) : 4;
};

export const DiceSelect: FC<Props> = ({ id, value, onChange }) => {
  const selectValue = getSelectValue(value);

  const handleSelectChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    const newValue = event.target.value;
    if (newValue === 'custom') {
      onChange('d4');
    } else {
      onChange(newValue);
    }
  };

  const handleNumberChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const num = parseInt(event.target.value, 10);
    if (num >= 2) {
      onChange(`d${num}`);
    }
  };

  return (
    <div className="flex gap-1">
      <Select id={id} value={selectValue} onChange={handleSelectChange}>
        {items.map((item, key) => (
          <option key={key} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      <TextInput
        type="number"
        max={1000}
        min={2}
        value={getCustomNumber(value)}
        onChange={handleNumberChange}
        className="w-20"
      />
    </div>
  );
};
