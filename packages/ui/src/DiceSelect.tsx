'use client';
import type { FC } from 'react';
import { Select } from './Select';

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
];

export const DiceSelect: FC<Props> = ({ id, value, onChange }) => {
  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    onChange(event.target.value);
  };
  return (
    <Select id={id} value={value} onChange={handleChange}>
      {items.map((item, key) => (
        <option key={key} value={item.value}>
          {item.label}
        </option>
      ))}
    </Select>
  );
};
