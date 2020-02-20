import React from 'react';
import { newId } from '../id';

export type TextChangeHandler = (value: string) => void;

interface Props {
  value: string;
  onChange: TextChangeHandler;
  label: string;
  type?: string;
  error?: string;
}

export const InputField: React.FC<Props> = ({ value, onChange, label, type, error }) => {
  const id = newId();
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type ?? 'text'} value={value} onChange={e => onChange(e.target.value)} />
      {error && error.length > 0 ? <p>{error}</p> : null}
    </div>
  );
};
