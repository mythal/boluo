import React, { type HTMLAttributes, type ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const FloatingBox = React.forwardRef<HTMLDivElement, Props>(function FloatingBox(
  { children, ...props }: Props,
  ref,
) {
  return (
    <div
      {...props}
      className="bg-card-bg border-card-border shadow-1/2 shadow-card-shadow rounded-sm border p-3 text-sm"
      ref={ref}
    >
      {children}
    </div>
  );
});

FloatingBox.displayName = 'FloatingBox';
