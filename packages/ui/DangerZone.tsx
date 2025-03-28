'use client';
import React, { type HTMLAttributes, type ReactNode, useEffect, useState } from 'react';

interface Props extends Exclude<HTMLAttributes<HTMLDivElement>, 'className' | 'onClick'> {
  children: ReactNode;
  prompt: ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export const DangerZone = function DangerZone({ children, prompt, ref, ...props }: Props) {
  const [isReveal, setReveal] = useState(false);
  useEffect(() => {
    if (!isReveal) return;
    const handle = window.setTimeout(() => setReveal(false), 5000);
    return () => window.clearTimeout(handle);
  }, [isReveal]);
  return (
    <div {...props} className="relative h-full w-full" onClick={() => setReveal(true)} ref={ref}>
      <button type="button" className={isReveal ? 'hidden' : 'absolute h-full w-full'}>
        {prompt}
      </button>

      <div className={isReveal ? '' : 'pointer-events-none opacity-10'}>{children}</div>
    </div>
  );
};
