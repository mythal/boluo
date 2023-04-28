import { forwardRef } from 'react';

interface Props {
  self?: boolean;
}

export const Cursor = forwardRef<HTMLSpanElement, Props>(({ self = false }, ref) => {
  return <span ref={ref} className="preview-cursor inline-block w-[2px] h-6 absolute bg-surface-900" />;
});

Cursor.displayName = 'Cursor';
