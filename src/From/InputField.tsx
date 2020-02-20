import React from 'react';
import { newId } from '../id';

export type TextChangeHandler = (value: string) => void;

interface Props {
  value: string;
  onChange: TextChangeHandler;
  disabled?: boolean;
  label?: string;
  type?: string;
  error?: string;
}

export const InputField: React.FC<Props> = ({ value, onChange, label, type, error, disabled }) => {
  const id = newId();
  const isError = error && error.length > 0;
  const isDisabled = disabled === true;
  return (
    <div className="text-sm py-1">
      {label === undefined ? null : (
        <label className="pr-2 py-1 w-2/5 text-right text-xs" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="w-full">
        <input
          className={`disabled:bg-gray-300 border border-gray-600 block w-full p-1 ${isError ? 'bg-red-200' : ''}`}
          id={id}
          type={type ?? 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={isDisabled}
        />

        {error && error.length > 0 ? <div className="text-xs py-1 text-red-900">{error}</div> : null}
      </div>
    </div>
  );
};
