import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Portal } from '../Portal';
import { useForceUpdate, useOutside } from '../../hooks';

function useRerenderWhenResize() {
  const forceUpdate = useForceUpdate();
  const timer = useRef<number | undefined>(undefined);

  const onResize = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(forceUpdate, 200);
  }, [forceUpdate]);

  useEffect(() => {
    window.addEventListener('resize', onResize);
    return () => window.clearTimeout(timer.current);
  }, [onResize]);
}

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
  useRerenderWhenResize();
  const overlayRef = useOverlayOutside(onOuter, anchor);
  const [node, setNode] = useState(anchor.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setNode(anchor.current), [anchor.current]);
  if (node === null) {
    return null;
  }
  const rect = node.getBoundingClientRect();
  const style: React.CSSProperties = {
    position: 'absolute',
  };
  const documentElement = document.documentElement;
  const { scrollTop, scrollLeft } = documentElement;
  if (y === -1) {
    style.top = scrollTop + rect.top;
  } else if (y === 0) {
    style.top = scrollTop + rect.top + rect.height / 2;
  } else if (y === 1) {
    style.top = scrollTop + rect.bottom;
  }

  if (x === -1) {
    style.left = scrollLeft + rect.left;
  } else if (x === 0) {
    style.left = scrollLeft + rect.left + rect.width / 2;
  } else if (x === 1) {
    style.left = scrollLeft + rect.right;
  }
  return (
    <Portal>
      <div ref={overlayRef} className={className} style={style}>
        {children}
      </div>
    </Portal>
  );
}

export default Overlay;
