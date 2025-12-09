import clsx from 'clsx';
import { type FC, type Ref } from 'react';

interface Props {
  ref?: Ref<HTMLDivElement>;
  children?: React.ReactNode;
}

export const MessageToolbarBox: FC<Props> = ({ ref, children }) => {
  return (
    <div
      ref={ref}
      className={clsx(
        'MessageToolbar',
        'font-ui',
        'bg-surface-raised border-border-default hover:border-border-strong absolute -top-3 right-2 z-10 flex flex-row rounded border p-0.5 shadow-sm transition-colors select-none',
      )}
    >
      {children}
    </div>
  );
};
