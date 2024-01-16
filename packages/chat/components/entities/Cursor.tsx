import { forwardRef } from 'react';

interface Props {
  self?: boolean;
}

export const Cursor = forwardRef<HTMLSpanElement, Props>(({ self = false }, ref) => {
  return (
    <>
      <span ref={ref} className="bg-highest absolute inline-block h-6 w-[2px]">
        {self && (
          <span className="bg-highest relative left-0 top-0 block h-[6px] w-[6px] -translate-x-[2px] -translate-y-[1px] rounded-full"></span>
        )}
      </span>
    </>
  );
});

Cursor.displayName = 'Cursor';
