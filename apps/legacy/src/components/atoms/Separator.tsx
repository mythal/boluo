import React from 'react';
import { cls } from '../../utils/classnames';

function Separator({ className, ref, ...props }: React.ComponentPropsWithRef<'hr'>) {
  return (
    <hr
      ref={ref}
      className={cls('border-legacy-line border-0 border-b border-solid', className)}
      {...props}
    />
  );
}

export default Separator;
