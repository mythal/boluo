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
        'self-start @2xl:text-right',
        shouldConcealNameOnLeft ? 'hidden @2xl:block' : '',
      )}
    >
      {!shouldConcealNameOnLeft && <span>{children}:</span>}
    </div>
  );
};
