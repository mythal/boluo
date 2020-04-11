import React from 'react';
import { Overlay } from './Overlay';

interface Props {
  open: boolean;
  dismiss: () => void;
  anchor: React.RefObject<HTMLElement | null>;
  t?: boolean;
  l?: boolean;
  r?: boolean;
}

export const Menu: React.FC<Props> = React.memo<Props>(({ children, open, dismiss, anchor, t, l, r }) => {
  const onClick: React.MouseEventHandler = (e) => {
    e.stopPropagation();
    dismiss();
  };

  return (
    <Overlay anchor={anchor} open={open} dismiss={dismiss} l={l} t={t} r={r}>
      <ul onClick={onClick} className="menu text-sm">
        {children}
      </ul>
    </Overlay>
  );
});
