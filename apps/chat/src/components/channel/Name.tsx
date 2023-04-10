import clsx from 'clsx';
import { Gamemaster } from 'icons';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';

interface Props {
  name: string | undefined | null;
  isMaster: boolean;
  className?: string;
  self: boolean;
}

export const Name: FC<Props> = ({ name, className, isMaster }) => {
  const isEmptyName = name === '' || name == null;
  const style = clsx(
    'font-bold flex-none w-[8rem] @xl:w-[10rem] @2xl:w-[12rem] text-right',
    isEmptyName && 'text-surface-500 font-mono',
    className,
  );
  return (
    <span className={style}>
      {isEmptyName ? <FormattedMessage defaultMessage="[NO NAME]" /> : name}
      {isMaster && <Gamemaster className="inline ml-1" />}
    </span>
  );
};
