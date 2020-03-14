import React, { useRef } from 'react';
import { cls } from '../classname';
import Overlay, { AnchorPosition } from './Overlay';

interface Props {
  dismiss: () => void;
  open: boolean;
  trigger: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  top?: boolean;
  left?: boolean;
  out?: boolean;
}

function Menu({ children, trigger, open, dismiss, top, left, out }: Props) {
  const position: AnchorPosition = { x: -1, y: 1 };
  let translate = 'origin-top-left';

  if (top) {
    position.y = -1;
    translate = '-translate-y-full origin-bottom';
  }

  if (left) {
    position.x = 1;
    translate = cls(translate, '-translate-x-full');
  }

  if (out) {
    if (left) {
      position.x = -1;
      position.y = 1;
    } else {
      position.x = 1;
      position.y = 1;
    }

    if (!top) {
      position.y = -1;
    }
  }

  return (
    <Overlay
      anchor={trigger}
      {...position}
      onOuter={dismiss}
      className={cls(
        'transition duration-150 transform z-30',
        open ? '' : ' scale-y-0 opacity-0 pointer-events-none',
        translate
      )}
    >
      <ul className="menu">{children}</ul>
    </Overlay>
  );
}

export default React.memo(Menu);
