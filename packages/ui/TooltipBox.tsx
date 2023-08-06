import { FC, forwardRef, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export const TooltipBox = forwardRef<HTMLDivElement, Props>(({ children }, ref) => {
  return <div ref={ref}>{children}</div>;
});

TooltipBox.displayName = 'TooltipBox';
