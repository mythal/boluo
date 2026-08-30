import React from 'react';
import { cls } from '../../utils/classnames';

function Title({ className, ref, ...props }: React.ComponentPropsWithRef<'h1'>) {
  return <h1 ref={ref} className={cls('legacy-title', className)} {...props} />;
}

export default Title;
