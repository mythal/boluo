import clsx from 'clsx';
import { FC, ReactNode } from 'react';

export const MessageNamePlate: FC<{
  children: ReactNode;
  continued?: boolean;
}> = ({ children, continued = false }) => {
  return (
    <div className={clsx('self-start @2xl:text-right', continued ? 'hidden @2xl:block' : '')}>
      {!continued && <span>{children}:</span>}
    </div>
  );
};
