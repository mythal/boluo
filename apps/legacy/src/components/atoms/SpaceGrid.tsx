import * as React from 'react';
import { cls } from '../../utils/classnames';

export function SpaceGrid({ className, ref, ...props }: React.ComponentPropsWithRef<'div'>) {
  return (
    <div
      ref={ref}
      className={cls('grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2', className)}
      {...props}
    />
  );
}
