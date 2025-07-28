import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForceUpdate } from '../../hooks/useForceUpdate';
import { useOutside } from '../../hooks/useOutside';
import { overlayZIndex } from '../../styles/atoms';
import { Portal } from './Portal';

function useRerenderWhenResize() {
  const forceUpdate = useForceUpdate();
  const timer = useRef<number | undefined>(undefined);

  const onResize = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(forceUpdate, 200);
  }, [forceUpdate]);

  useEffect(() => {
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(timer.current);
    };
  }, [onResize]);
}

export interface AnchorPosition {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
  selfX?: -1 | 0 | 1;
  selfY?: -1 | 0 | 1;
}

type Props = React.HTMLAttributes<HTMLDivElement> &
  AnchorPosition & {
    anchor: React.RefObject<HTMLElement | null>;
    children: React.ReactNode;
    className?: string;
    onOuter?: () => void;
    zIndex?: number;
  };

function Overlay({
  anchor,
  children,
  x,
  y,
  className,
  onOuter,
  selfX,
  selfY,
  zIndex,
  ...divProps
}: Props): React.ReactElement | null {
  useRerenderWhenResize();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  useOutside(onOuter, overlayRef, anchor);
  const [node, setNode] = useState(anchor.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setNode(anchor.current), [anchor.current]);
  if (node == null) {
    return null;
  }
  const rect = node.getBoundingClientRect();
  const style: React.CSSProperties = {
    position: 'absolute',
    zIndex: zIndex || overlayZIndex,
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
  if (selfX === undefined) {
    selfX = x;
  }
  if (selfY === undefined) {
    selfY = y;
  }
  let translateX = '0';
  let translateY = '0';
  if (selfX === -1) {
    translateX = '-100%';
  } else if (selfX === 0) {
    translateX = '-50%';
  }
  if (selfY === -1) {
    translateY = '-100%';
  } else if (selfY == 0) {
    translateY = '-50%';
  }
  style.transform = `translate(${translateX}, ${translateY})`;
  return (
    <Portal>
      <div ref={overlayRef} className={className} style={style} {...divProps}>
        {children}
      </div>
    </Portal>
  );
}

export default Overlay;
