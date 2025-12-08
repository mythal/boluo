import clsx from 'clsx';
import { FC, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  shouldConcealNameOnLeft?: boolean;
}

export const MessageNamePlate: FC<Props> = ({ children, shouldConcealNameOnLeft = false }) => {
  return (
    <div
      className={clsx(
        'irc:text-right self-start',
        shouldConcealNameOnLeft ? 'irc:block hidden' : '',
      )}
    >
      {!shouldConcealNameOnLeft && <span>{children}:</span>}
    </div>
  );
};
