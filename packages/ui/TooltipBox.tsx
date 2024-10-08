'use client';
import { FloatingPortal } from '@floating-ui/react';
import { forwardRef, type ReactNode } from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  show: boolean;
  defaultStyle?: boolean;
  children: ReactNode;
}

export const TooltipBox = forwardRef<HTMLDivElement, Props>(
  ({ show, children, defaultStyle = false, className, ...props }, ref) => {
    if (!show) return null;
    return (
      <FloatingPortal>
        <div
          ref={ref}
          className={
            defaultStyle
              ? 'TooltipBox bg-tooltip-bg text-tooltip-text shadow-tooltip-shadow/50 rounded-sm px-2 py-1 text-sm shadow-[1px_2px_0_0]'
              : className
          }
          {...props}
        >
          {children}
        </div>
      </FloatingPortal>
    );
  },
);

TooltipBox.displayName = 'TooltipBox';
