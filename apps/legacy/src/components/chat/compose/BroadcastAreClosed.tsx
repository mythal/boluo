import React from 'react';
import { cls } from '../../../utils/classnames';

interface Props {
  className?: string;
}

export const BroadcastAreClosed = ({ className }: Props) => {
  return <span className={cls('italic', className)}>[预览广播已关闭]</span>;
};
