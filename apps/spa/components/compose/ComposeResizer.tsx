import { useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronUp } from '@boluo/icons';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import Icon from '@boluo/ui/Icon';
import { useAtom } from 'jotai';
import { composeSizeAtom } from '../../state/compose.atoms';
import { useIsTouch } from '@boluo/ui/hooks/useIsTouch';

export const ComposeResizer = () => {
  const [size, setSize] = useAtom(composeSizeAtom);
  const [dragging, setDragging] = useState(false);
  const dragStartYRef = useRef<number | null>(null);
  const isTouch = useIsTouch();

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const startY = dragStartYRef.current;
    dragStartYRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (startY === null) return;
    const delta = event.clientY - startY;
    if (Math.abs(delta) < 6) return;
    setSize(delta < 0 ? 'LARGE' : 'AUTO');
    setDragging(false);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  return (
    <>
      {isTouch ? (
        <div className="absolute -top-2 right-24 z-30 flex">
          <ButtonInline
            aria-pressed={size === 'LARGE'}
            onClick={() => setSize(size === 'LARGE' ? 'AUTO' : 'LARGE')}
          >
            <Icon icon={ChevronUp} />
          </ButtonInline>
        </div>
      ) : (
        <div
          className={clsx(
            'group/resizer absolute top-0 right-0 z-20 flex h-3 w-full cursor-row-resize opacity-0 group-hover/compose:opacity-30 hover:opacity-50',
            dragging && 'opacity-100',
          )}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div className="bg-brand-strong h-px w-full group-hover/resizer:h-1" />
        </div>
      )}
    </>
  );
};
