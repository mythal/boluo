import clsx from 'clsx';
import React from 'react';
import type { DataAttr } from './types';

type DataAttrProps = DataAttr<{
  state?: 'error' | 'default' | 'warning';
}>;
type InputProps = React.ComponentPropsWithoutRef<'input'> & DataAttrProps;
type TextAreaProps = React.ComponentPropsWithoutRef<'textarea'> & DataAttrProps;

export const TextInput = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const state = props['data-state'] ?? 'default';
  return (
    <input
      ref={ref}
      {...props}
      className={clsx(
        'input',
        state === 'default' && 'input-default',
        state === 'error' && 'input-error',
        state === 'warning' && 'input-warning',
        props.className,
      )}
    />
  );
});
TextInput.displayName = 'Input';

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>((props, ref) => {
  const state = props['data-state'] ?? 'default';
  return (
    <textarea
      {...props}
      className={clsx(
        'input',
        state === 'default' && 'input-default',
        state === 'error' && 'input-error',
        state === 'warning' && 'input-warning',
        props.className,
      )}
      ref={ref}
    />
  );
});
TextArea.displayName = 'TextArea';
