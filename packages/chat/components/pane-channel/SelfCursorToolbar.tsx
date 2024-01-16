import { forwardRef, RefObject, useContext, useEffect, useImperativeHandle, useState } from 'react';
import { shift, useFloating } from '@floating-ui/react';
import { SelfCursorToolbarButtons } from './SelfCursorToolbarButtons';
import { CursorContext } from '../entities/TextWithCursor';

interface Props {
  contentRef: RefObject<HTMLDivElement | null>;
  cursorRef: RefObject<HTMLElement | null>;
}

export interface CursorToolbarHandle {
  update: () => void;
}

export const SelfCursorToolbar = forwardRef<CursorToolbarHandle, Props>(({ contentRef, cursorRef }, ref) => {
  // `useContext` will trigger a re-render when the cursor state changes.
  const cursorState = useContext(CursorContext);

  const { update, floatingStyles, refs } = useFloating({
    elements: {
      reference: cursorRef.current,
    },
    middleware: [shift()],
  });
  useImperativeHandle(ref, () => ({ update }));

  if (!cursorState) return null;
  const [a, b] = cursorState.range;
  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="bg-lowest border-highest flex select-none items-center justify-center rounded-lg border-[2px] shadow"
    >
      <SelfCursorToolbarButtons collapsed={a === b} />
    </div>
  );
});

SelfCursorToolbar.displayName = 'SelfCursorToolbar';
