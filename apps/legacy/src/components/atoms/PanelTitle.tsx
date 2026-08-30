import React from 'react';
import { cls } from '../../utils/classnames';

export function PanelTitle({ className, ref, ...props }: React.ComponentPropsWithRef<'h1'>) {
  return <h1 ref={ref} className={cls('legacy-panel-title', className)} {...props} />;
}
