import { useSetAtom, type PrimitiveAtom } from 'jotai';
import { FC, forwardRef } from 'react';

interface Props {
  self?: boolean;
  atom: PrimitiveAtom<HTMLElement | null>;
}

export const Cursor: FC<Props> = ({ self = false, atom }) => {
  const setRef = useSetAtom(atom);
  return (
    <span className="absolute z-20 inline-block h-[50px] w-[2px]">
      <span ref={setRef} className="bg-highest relative inline-block h-[24px] w-[2px]">
        {self && (
          <span className="bg-highest relative left-0 top-full block h-[6px] w-[6px] -translate-x-[2px] -translate-y-[1px] rounded-full"></span>
        )}
      </span>
    </span>
  );
};

Cursor.displayName = 'Cursor';
