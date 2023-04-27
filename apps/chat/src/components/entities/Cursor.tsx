import { FC, useEffect, useRef } from 'react';
import { useScrollerRef } from '../../hooks/useScrollerRef';

interface Props {
  self?: boolean;
}

export const Cursor: FC<Props> = ({ self = false }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const scrollerRef = useScrollerRef();
  useEffect(() => {
    const cursor = ref.current;
    if (cursor === null) return;
    const scroller = scrollerRef.current;
    if (scroller === null) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const cursorRect = cursor.getBoundingClientRect();
    if (cursorRect.bottom > scrollerRect.bottom || cursorRect.top < scrollerRect.top) {
      cursor.scrollIntoView();
    }
  }, [scrollerRef]);
  return <span ref={ref} className="preview-cursor inline-block w-[2px] h-6 absolute bg-surface-900" />;
};
