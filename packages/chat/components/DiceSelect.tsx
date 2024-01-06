import type { FC } from 'react';
import { Select } from 'ui/Select';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}

const items = [
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
