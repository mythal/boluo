import React from 'react';
import { cls } from '../../utils/classnames';
import { inputClassName } from './Input';

function TextArea({ className, ref, ...props }: React.ComponentPropsWithRef<'textarea'>) {
  return (
    <textarea ref={ref} className={cls(inputClassName, 'legacy-textarea', className)} {...props} />
  );
}

export default TextArea;
