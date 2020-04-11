import React, { useEffect, useRef, useState } from 'react';
import { Portal } from './Portal';
import { useForceUpdate, useOutside } from '../hooks';

/* eslint-disable react-hooks/exhaustive-deps */
function useRecompute() {
  const forceUpdate = useForceUpdate();
  const timer = useRef<number | undefined>(undefined);

  const onResize = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(forceUpdate, 200);
  };

  useEffect(() => {
    window.addEventListener('resize', onResize);
    return () => window.clearTimeout(timer.current);
  }, []);
}
/* eslint-enable react-hooks/exhaustive-deps */

function useOverlayOutside(onOutside: (() => void) | undefined, anchor: React.RefObject<HTMLElement | null>) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  useOutside(onOutside, overlayRef, anchor);
  return overlayRef;
}

export interface AnchorPosition {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
}

interface Props extends AnchorPosition {
  anchor: React.RefObject<HTMLElement | null>;
  children: React.ReactChild;
  className?: string;
  onOuter?: () => void;
}

function Overlay({ anchor, children, x, y, className, onOuter }: Props) {
  useRecompute();
  const overlayRef = useOverlayOutside(onOuter, anchor);
  const [style, setStyle] = useState<React.CSSProperties>({});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!anchor.current) {
      return;
    }
    const node = anchor.current;
    const rect = node.getBoundingClientRect();
    const documentElement = document.documentElement;
    const { scrollTop, scrollLeft } = documentElement;
    const nextStyle: React.CSSProperties = {
      position: 'absolute',
    };
    if (y === -1) {
      nextStyle.top = scrollTop + rect.top;
    } else if (y === 0) {
      nextStyle.top = scrollTop + rect.top + rect.height / 2;
    } else if (y === 1) {
      nextStyle.top = scrollTop + rect.bottom;
    }

    if (x === -1) {
      nextStyle.left = scrollLeft + rect.left;
    } else if (x === 0) {
      nextStyle.left = scrollLeft + rect.left + rect.width / 2;
    } else if (x === 1) {
      nextStyle.left = scrollLeft + rect.right;
    }

    if (
      nextStyle.top !== style.top ||
      nextStyle.left !== style.left ||
      nextStyle.bottom !== style.bottom ||
      nextStyle.right !== style.right
    ) {
      setStyle(nextStyle);
    }
  });

  return (
    <Portal>
      <div ref={overlayRef} className={className} style={style}>
        {children}
      </div>
    </Portal>
  );
}

export default Overlay;
