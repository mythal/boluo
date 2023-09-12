import React, { HTMLAttributes, ReactNode, useCallback, useState } from 'react';
import { useOutside } from '../../hooks/useOutside';

interface Props extends Exclude<HTMLAttributes<HTMLDivElement>, 'className' | 'onClick'> {
  children: ReactNode;
  prompt: ReactNode;
}

export const DangerZone = React.forwardRef<HTMLDivElement, Props>(({ children, prompt, ...props }, ref) => {
  const [isReveal, setReveal] = useState(false);
  return (
    <div
      {...props}
      className="w-full h-full relative"
      onClick={() => setReveal(true)}
      ref={ref}
    >
      <button type="button" className={isReveal ? 'hidden' : 'absolute w-full h-full'}>
        {prompt}
      </button>

      <div className={isReveal ? '' : 'blur-sm opacity-25 pointer-events-none'}>
        {children}
      </div>
    </div>
  );
});

DangerZone.displayName = 'DangerZone';
