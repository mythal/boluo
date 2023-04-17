import { FC, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useScrollerRef } from '../../hooks/useScrollerRef';
import { SelfCursorToolbar } from './SelfCursorToolbar';

interface Props {
}

export const SelfCursor: FC<Props> = () => {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useScrollerRef();
  useEffect(() => {
    const handle = window.setInterval(() => {
      const cursor = cursorRef.current;
      const toolbar = toolbarRef.current;
      if (!cursor || !toolbar || toolbar.matches(':hover')) return;
      const cursorRect = cursor.getBoundingClientRect();
      const toolbarRect = toolbar.getBoundingClientRect();

      toolbar.style.left = `${cursorRect.x - 4}px`;
      toolbar.style.top = `${cursorRect.y + cursorRect.height + 4}px`;

      const scroller = scrollerRef.current;
      if (!scroller) return;
      const scrollerRect = scroller.getBoundingClientRect();
      const scrollerRight = scrollerRect.left + scrollerRect.width;

      const flipped = toolbar.getAttribute('data-flipped') === 'true';
      if (toolbarRect.left + toolbarRect.width > scrollerRight) {
        toolbar.setAttribute('data-flipped', 'true');
      } else if (flipped && toolbarRect.right + toolbarRect.width + 64 < scrollerRight) {
        toolbar.setAttribute('data-flipped', 'false');
      }
      const scrollerBottom = scrollerRect.top + scrollerRect.height;
      if (cursorRect.top + cursorRect.height > scrollerBottom) {
        toolbar.setAttribute('data-hide', 'true');
      } else {
        toolbar.setAttribute('data-hide', 'false');
      }
    }, 200);

    return () => {
      window.clearInterval(handle);
    };
  }, [scrollerRef]);

  return (
    <>
      <div className="inline-block w-[2px] h-6 absolute bg-surface-900" ref={cursorRef}>
      </div>
      {createPortal(
        <SelfCursorToolbar ref={toolbarRef} />,
        document.body,
      )}
    </>
  );
};
