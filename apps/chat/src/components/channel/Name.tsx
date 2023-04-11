import clsx from 'clsx';
import { Gamemaster } from 'icons';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { TextInput } from 'ui';

interface Props {
  name: string | undefined | null;
  isMaster: boolean;
  className?: string;
  self: boolean;
  isPreview?: boolean;
}

export const Name: FC<Props> = ({ name, className, isMaster, isPreview = false, self }) => {
  const isEmptyName = name === '' || name == null;
  const masterIcon = <Gamemaster className="inline ml-1" />;
  return (
    <span
      className={clsx(
        'font-bold flex-none w-[8rem] @xl:w-[10rem] @2xl:w-[12rem] break-all',
        isEmptyName && 'text-error-400 font-mono',
        className,
      )}
    >
      {isEmptyName ? <FormattedMessage defaultMessage="[NO NAME]" /> : name}
      {isMaster && masterIcon}
    </span>
  );
};
