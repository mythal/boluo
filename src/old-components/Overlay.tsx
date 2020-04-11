import React, { useEffect, useRef, useState } from 'react';
import { Portal } from './Portal';
import { useForceUpdate, useOutside } from '../hooks';
import { cls } from '../utils';

export interface Props {
  open?: boolean;
  dismiss?: () => void;
  anchor: React.RefObject<HTMLElement | null>;
  t?: boolean;
  l?: boolean;
  r?: boolean;
}

export const Overlay: React.FC<Props> = React.memo<Props>(({ children, open, dismiss, anchor, t, l, r }) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const rerender = useForceUpdate();

  useOutside(dismiss, overlayRef);

  const onResize = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(rerender, 200);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (anchor.current) {
      const node = anchor.current;
      const rect = node.getBoundingClientRect();
      const documentElement = document.documentElement;
      let top = rect.top + documentElement.scrollTop;
      if (!t) {
        top += node.clientHeight;
      }
      let left = rect.left + documentElement.scrollLeft;
      if (l) {
        left += node.clientWidth;
      } else if (r) {
      } else {
        left += node.clientWidth >> 1;
      }

      if (top !== style.top || left !== style.left) {
        setStyle({
          position: 'absolute',
          top,
          left,
        });
      }
    }
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(timer.current);
    };
  });

  if (open === false) {
    return null;
  }

  let translateX = '-translate-x-1/2';
  if (l) {
    translateX = '-translate-x-full';
  } else if (r) {
    translateX = 'translate-x-0';
  }

  return (
    <Portal>
      <div
        className={cls('absolute z-10 text-sm transform', translateX, { '-translate-y-full': t })}
        style={style}
        ref={overlayRef}
      >
        {children}
      </div>
    </Portal>
  );
});
