'use client';
import { FloatingPortal } from '@floating-ui/react';
import { type FC, type ReactNode } from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  show: boolean;
  defaultStyle?: boolean;
  children: ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export const TooltipBox: FC<Props> = ({
  show,
  children,
  defaultStyle = false,
  className,
  ref,
  ...props
}) => {
  if (!show) return null;
  return (
    <FloatingPortal>
      <div
        ref={ref}
        className={
          defaultStyle
            ? 'TooltipBox dark bg-tooltip-bg text-tooltip-text rounded-sm px-2 py-1 text-sm shadow-lg'
            : className
        }
        {...props}
      >
        {children}
      </div>
    </FloatingPortal>
  );
};
