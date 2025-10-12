'use client';
import clsx from 'clsx';
import { type FC, type ReactNode } from 'react';

export const SelectBox: FC<{
  title: ReactNode;
  description?: ReactNode;
  selected: boolean;
  onSelected: () => void;
}> = ({ title, description, selected, onSelected }) => {
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.checked) {
      onSelected();
    }
  };
  return (
    <label
      role="radio"
      className={clsx(
        selected
          ? 'bg-surface-selectable-selected'
          : 'bg-surface-default hover:bg-surface-selectable-hover',
        'grid cursor-pointer grid-cols-[1rem_auto] gap-x-2 gap-y-1 rounded px-4 py-3 transition-colors',
      )}
    >
      <div className="self-start pt-1">
        <input type="radio" checked={selected} onChange={handleChange} className="block h-4 w-4" />
      </div>
      <div className="">{title}</div>
      {description && <div className="text-text-secondary col-start-2 text-sm">{description}</div>}
    </label>
  );
};
