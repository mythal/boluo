import { forwardRef } from 'react';

interface Props {
  self?: boolean;
}

export const Cursor = forwardRef<HTMLSpanElement, Props>(({ self = false }, ref) => {
  return <span ref={ref} className="preview-cursor bg-surface-900 absolute inline-block h-6 w-[2px]" />;
});

Cursor.displayName = 'Cursor';
