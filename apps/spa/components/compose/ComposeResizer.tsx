import { type RefObject, useRef, useState } from 'react';
import clsx from 'clsx';
import ChevronUp from '@boluo/icons/ChevronUp';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import Icon from '@boluo/ui/Icon';
import { useAtom } from 'jotai';
import { composeSizeAtom, type ComposeSize } from '../../state/compose.atoms';
import { useIsTouch } from '@boluo/ui/hooks/useIsTouch';
import { COMPOSE_AUTO_MAX_HEIGHT, COMPOSE_LARGE_HEIGHT } from './composeSize';

const getTargetSize = (delta: number, current: ComposeSize) => {
  if (Math.abs(delta) < 6) return current;
  return delta < 0 ? 'LARGE' : 'AUTO';
};

interface Props {
  composeContainerRef: RefObject<HTMLDivElement | null>;
}

export const ComposeResizer = ({ composeContainerRef }: Props) => {
  const [size, setSize] = useAtom(composeSizeAtom);
  const [dragging, setDragging] = useState(false);
  const [previewSize, setPreviewSize] = useState<ComposeSize | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  // Cache the last measured AUTO height so we can preview shrinking even when starting from LARGE.
  const lastAutoHeightRef = useRef<number | null>(null);
  const isTouch = useIsTouch();

  const getAutoHeight = () => {
    if (lastAutoHeightRef.current != null) {
      return `${lastAutoHeightRef.current}px`;
    }
    return COMPOSE_AUTO_MAX_HEIGHT;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPreviewSize(size);
    if (size === 'AUTO') {
      const rect = composeContainerRef.current?.getBoundingClientRect();
      if (rect) {
        lastAutoHeightRef.current = rect.height;
      }
    }
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const startY = dragStartYRef.current;
    if (startY === null) return;
    const delta = event.clientY - startY;
    setPreviewSize(getTargetSize(delta, size));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const startY = dragStartYRef.current;
    dragStartYRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
    setPreviewSize(null);
    if (startY === null) return;
    const delta = event.clientY - startY;
    const targetSize = getTargetSize(delta, size);
    if (targetSize !== size) {
      setSize(targetSize);
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
    setPreviewSize(null);
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
        <>
          {previewSize && dragging && (
            <div className="pointer-events-none absolute inset-0 z-10">
              <div
                className="bg-brand-strong/10 absolute right-2 left-2 rounded shadow-xs transition-[height] duration-75 ease-out"
                style={{
                  height: previewSize === 'LARGE' ? COMPOSE_LARGE_HEIGHT : getAutoHeight(),
                  bottom: '0.5rem',
                }}
              >
                <div className="text-brand-strong absolute inset-x-0 bottom-1 text-center font-mono text-sm">
                  {previewSize === 'LARGE' ? 'Expanded' : 'Auto size'}
                </div>
              </div>
            </div>
          )}
          <div
            className={clsx(
              'group/resizer absolute top-0 right-0 z-20 flex h-3 w-full cursor-row-resize opacity-0 group-hover/compose:opacity-30 hover:opacity-50',
              dragging && 'opacity-100',
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <div className="bg-brand-strong h-px w-full group-hover/resizer:h-1" />
          </div>
        </>
      )}
    </>
  );
};
