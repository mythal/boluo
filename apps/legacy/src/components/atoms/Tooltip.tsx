import * as React from 'react';
import { cls } from '../../utils/classnames';

export interface TooltipProps {
  children: React.ReactNode;
  className?: string;
  x?: 'left' | 'center' | 'right';
}

function Tooltip({ children, className, x = 'center' }: TooltipProps) {
  return (
    <div
      className={cls(
        "bg-legacy-black font-legacy-sans text-legacy-white after:border-t-legacy-black pointer-events-none absolute -top-1 left-1/2 z-[100] -translate-x-1/2 -translate-y-full rounded-[3px] p-2 text-[1rem] font-normal not-italic after:absolute after:top-full after:left-1/2 after:block after:size-0 after:-translate-x-1/2 after:border-[0.5rem] after:border-solid after:border-transparent after:content-[''] data-[x=left]:left-full data-[x=left]:-translate-x-full data-[x=left]:after:right-0 data-[x=left]:after:left-[unset]",
        className,
      )}
      data-x={x}
    >
      <div className="inline-block w-max max-w-40">{children}</div>
    </div>
  );
}

export default Tooltip;
