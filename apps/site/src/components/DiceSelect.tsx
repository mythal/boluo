import type { FC } from 'react';
import { Select } from 'ui/Select';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const items = [
  { label: 'D20', value: 'd20' },
  { label: 'D100', value: 'd100' },
];

export const DiceSelect: FC<Props> = ({ value, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value);
  return (
    <Select value={value} onChange={handleChange}>
      {items.map(({ label, value }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  );
};
