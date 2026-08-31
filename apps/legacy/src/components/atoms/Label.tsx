import React from 'react';
import { cls } from '../../utils/classnames';

export function Label({ className, ref, ...props }: React.ComponentPropsWithRef<'label'>) {
  return <label ref={ref} className={cls('block py-2', className)} {...props} />;
}
