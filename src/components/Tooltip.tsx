import React, { ReactChild } from 'react';
import { cls } from '../classname';

interface Props {
  message: ReactChild;
  className?: string;
  bottom?: boolean;
}

export const Tooltip: React.FC<Props> = ({ message, children, className, bottom }) => {
  return (
    <span className="tooltip-wrap">
      <span className={cls('tooltip-content', { 'tooltip-bottom': bottom }, className)}>{message}</span>
      {children}
    </span>
  );
};
