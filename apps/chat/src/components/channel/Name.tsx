import clsx from 'clsx';
import { Gamemaster } from 'icons';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';

interface Props {
  name: string | undefined | null;
  isMaster: boolean;
  className?: string;
  self: boolean;
  isPreview?: boolean;
}

export const Name: FC<Props> = ({ name, className, isMaster, isPreview = false, self }) => {
  const isEmptyName = name === '' || name == null;
  const masterIcon = (
    <Delay fallback={<FallbackIcon />}>
      <Gamemaster className="inline-block h-[1em] w-[1em]" />
    </Delay>
  );
  return (
    <span
      className={clsx(
        'font-bold flex-none w-[8rem] @xl:w-[10rem] @2xl:w-[12rem] break-all',
        isEmptyName && 'text-error-400 font-mono',
        className,
      )}
    >
      <span className="mr-1">
        {isEmptyName ? <FormattedMessage defaultMessage="[NO NAME]" /> : name}
      </span>
      {isMaster && masterIcon}
    </span>
  );
};
