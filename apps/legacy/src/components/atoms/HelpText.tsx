import React from 'react';
import { cls } from '../../utils/classnames';

export function HelpText({ className, ref, ...props }: React.ComponentPropsWithRef<'small'>) {
  return (
    <small
      ref={ref}
      className={cls('legacy-help-text text-legacy-text-minor', className)}
      {...props}
    />
  );
}
