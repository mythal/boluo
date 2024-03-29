import { useSetAtom, type PrimitiveAtom } from 'jotai';
import { FC, forwardRef } from 'react';

interface Props {
  self?: boolean;
  atom: PrimitiveAtom<HTMLElement | null>;
}

export const Cursor: FC<Props> = ({ self = false, atom }) => {
  const setRef = useSetAtom(atom);
  return (
    <span ref={setRef} className="bg-highest absolute inline-block h-6 w-[2px]">
      {self && (
        <span className="bg-highest relative left-0 top-0 block h-[6px] w-[6px] -translate-x-[2px] -translate-y-[1px] rounded-full"></span>
      )}
    </span>
  );
};

Cursor.displayName = 'Cursor';
