import React from 'react';
import { cls } from '../../utils/classnames';

export function ErrorMessage({ className, ref, ...props }: React.ComponentPropsWithRef<'p'>) {
  return (
    <p
      ref={ref}
      className={cls('legacy-error-message text-legacy-error-text text-[0.875rem]', className)}
      {...props}
    />
  );
}
