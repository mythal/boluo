import React, { HTMLAttributes, ReactNode, useCallback, useState } from 'react';
import { useOutside } from '../../hooks/useOutside';

interface Props extends Exclude<HTMLAttributes<HTMLDivElement>, 'className' | 'onClick'> {
  children: ReactNode;
  prompt: ReactNode;
}

export const DangerZone = React.forwardRef<HTMLDivElement, Props>(({ children, prompt, ...props }, ref) => {
  const [isReveal, setReveal] = useState(false);
  return (
    <div {...props} className="relative h-full w-full" onClick={() => setReveal(true)} ref={ref}>
      <button type="button" className={isReveal ? 'hidden' : 'absolute h-full w-full'}>
        {prompt}
      </button>

      <div className={isReveal ? '' : 'pointer-events-none opacity-25 blur-sm'}>{children}</div>
    </div>
  );
});

DangerZone.displayName = 'DangerZone';
