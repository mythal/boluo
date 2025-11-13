import React, { type HTMLAttributes, type ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export const FloatingBox = function FloatingBox({ children, ref, ...props }: Props) {
  return (
    <div
      {...props}
      className="bg-surface-raised border-border-raised rounded-sm border p-3 text-sm shadow"
      ref={ref}
    >
      {children}
    </div>
  );
};

FloatingBox.displayName = 'FloatingBox';
