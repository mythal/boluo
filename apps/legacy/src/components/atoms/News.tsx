import * as React from 'react';
import { cls } from '../../utils/classnames';

export function News({ className, ref, ...props }: React.ComponentPropsWithRef<'div'>) {
  return (
    <div
      ref={ref}
      className={cls(
        'border-legacy-blue-800 bg-legacy-blue-900 rounded-[3px] border border-solid p-2 text-[0.875rem]',
        className,
      )}
      {...props}
    />
  );
}
