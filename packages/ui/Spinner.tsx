import { CircleNotch } from 'boluo-icons';
import clsx from 'clsx';
import React from 'react';
import Icon from './Icon';

interface Props {
  className?: string;
  label?: string;
}

export const Spinner: React.FC<Props> = ({ label, className }) => {
  return <Icon className={clsx('animate-spin', className)} icon={CircleNotch} label={label} />;
};
Spinner.displayName = 'Spinner';
