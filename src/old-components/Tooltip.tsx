import React, { ReactChild, useEffect, useRef, useState } from 'react';
import { Portal } from './Portal';
import { cls } from '../utils';

interface Props {
  message: ReactChild;
  className?: string;
  l?: boolean;
  r?: boolean;
  b?: boolean;
}

export const Tooltip: React.FC<Props> = ({ message, children, className, l, r, b }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [show, setShow] = useState<boolean>();
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (ref.current) {
      const node = ref.current;
      let top = node.offsetTop;
      if (b) {
        top += node.clientHeight;
      }
      let left = node.offsetLeft;
      if (r) {
      } else if (l) {
        left += node.clientWidth;
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
  });

  return (
    <span className="tooltip-wrap" ref={ref} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {show && (
        <Portal>
          <div
            className={cls('tooltip', { 'tooltip-left': l }, { 'tooltip-right': r }, { 'tooltip-bottom': b })}
            style={style}
          >
            {message}
          </div>
        </Portal>
      )}
      {children}
    </span>
  );
};
