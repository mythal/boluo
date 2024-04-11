import React, { HTMLAttributes, ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const FloatingBox = React.forwardRef<HTMLDivElement, Props>(({ children, ...props }, ref) => {
  return (
    <div {...props} className="bg-floating-bg border-lowest rounded border p-3 text-sm shadow-lg" ref={ref}>
      {children}
    </div>
  );
});

FloatingBox.displayName = 'FloatingBox';
