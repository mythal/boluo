import React from 'react';
import { cls } from '../../classname';

interface Props {
  name: string;
  className?: string;
}

export const Name = React.memo<Props>(({ name, className }) => {
  return <span className={cls('font-bold', className)}>{name}</span>;
});
