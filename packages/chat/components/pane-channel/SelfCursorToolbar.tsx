import clsx from 'clsx';
import { Bold, Dice, Link } from 'icons';
import { useSetAtom } from 'jotai';
import { memo, RefObject, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useScrollerRef } from '../../hooks/useScrollerRef';
import { SelfCursorButton } from './SelfCursorButton';

interface Props {
  contentRef: RefObject<HTMLDivElement | null>;
}

export const SelfCursorToolbar = memo<Props>(({ contentRef }) => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const handleAddDice = () => dispatch({ type: 'addDice', payload: {} });
  const handleAddLink = () => dispatch({ type: 'link', payload: { text: '', href: '' } });
  const handleBold = () => dispatch({ type: 'bold', payload: { text: '' } });
  const scrollerRef = useScrollerRef();
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handle = window.setInterval(() => {
      const content = contentRef.current;
      if (!content) return;
      const cursor = content.querySelector('.preview-cursor');
      const toolbar = ref.current;
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
  }, [contentRef, scrollerRef]);
  return createPortal(
    <div
      ref={ref}
      data-flip="false"
      data-hide="false"
      className={clsx(
        'bg-preview-toolbar fixed inline-flex rounded-sm border border-black shadow-md transition-all duration-100 ease-out',
        'data-[flipped=true]:-translate-x-full',
        'data-[hide=true]:hidden',
        'opacity-50 hover:opacity-100',
      )}
    >
      <SelfCursorButton onClick={handleAddDice}>
        <Dice />
      </SelfCursorButton>
      <SelfCursorButton onClick={handleAddLink}>
        <Link />
      </SelfCursorButton>
      <SelfCursorButton onClick={handleBold}>
        <Bold />
      </SelfCursorButton>
    </div>,
    document.body,
  );
});
SelfCursorToolbar.displayName = 'SelfCursorToolbar';
