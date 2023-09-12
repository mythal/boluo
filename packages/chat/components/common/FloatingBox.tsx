import React, { HTMLAttributes, ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const FloatingBox = React.forwardRef<HTMLDivElement, Props>(({ children, ...props }, ref) => {
  return (
    <div
      {...props}
      className="p-3 bg-lowest rounded-sm text-sm shadow-1 shadow-surface-500/25 border-1/2 border-surface-800"
      ref={ref}
    >
      {children}
    </div>
  );
});

FloatingBox.displayName = 'FloatingBox';
