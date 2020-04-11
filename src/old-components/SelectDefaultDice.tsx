import React from 'react';

interface Props {
  value: string;
  setValue: (next: string) => void;
}

export const SelectDefaultDice = React.memo<Props>(({ value, setValue }) => {
  return (
    <label>
      默认骰子类型：
      <select value={value} onChange={(e) => setValue(e.target.value)} className="text-lg p-2">
        <option value="d20">D20</option>
        <option value="d100">D100</option>
        <option value="d4">D4</option>
        <option value="d6">D6</option>
        <option value="d8">D8</option>
        <option value="d10">D10</option>
      </select>
    </label>
  );
});
