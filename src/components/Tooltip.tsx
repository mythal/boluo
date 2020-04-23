import React, { useRef, useState } from 'react';
import Overlay, { AnchorPosition } from './atoms/Overlay';
import { cls } from '../utils';

interface Props extends AnchorPosition {
  message: React.ReactChild;
  children: React.ReactChild;
  className?: string;
}

function Tooltip({ message, children, x, y, className }: Props) {
  const wrapper = useRef<HTMLSpanElement | null>(null);
  const [mount, setMount] = useState<boolean>(false);
  const [show, setShow] = useState<boolean>(false);

  const open = () => {
    setMount(true);
    setShow(true);
  };
  const dismiss = () => setShow(false);

  return (
    <React.Fragment>
      <span style={{ display: 'inline-block' }} onMouseEnter={open} onMouseLeave={dismiss} ref={wrapper}>
        {children}
      </span>
      {mount && (
        <Overlay
          anchor={wrapper}
          x={x}
          y={y}
          className={cls('z-20 pointer-events-none transform', show ? 'tooltip-show' : 'tooltip-hide')}
        >
          <div className={cls('text-white bg-gray-800 px-2 py-1 shadow rounded-sm', className)}>{message}</div>
        </Overlay>
      )}
    </React.Fragment>
  );
}

export default Tooltip;
