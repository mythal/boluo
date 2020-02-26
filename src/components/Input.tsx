import React from 'react';
import { newId } from '../id';
import { cls } from '../classname';

interface Props {
  value: string;
  onChange: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  type?: string;
  error?: string | null;
}

export const Input: React.FC<Props> = ({ value, onChange, label, type, error, disabled, placeholder }) => {
  const id = newId();
  const isError = Boolean(error && error.length > 0);
  const isDisabled = disabled === true;
  return (
    <span className="inline-block py-1 w-full">
      {label === undefined ? null : (
        <label className="block py-1 text-xs" htmlFor={id}>
          {label}
        </label>
      )}

      <input
        className={cls('input block w-full', { 'input-error': isError })}
        id={id}
        type={type ?? 'text'}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        disabled={isDisabled}
      />

      {isError ? <div className="block text-xs py-1 text-red-600">{error}</div> : null}
    </span>
  );
};
