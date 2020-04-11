import React from 'react';
import { Overlay } from './Overlay';

interface Props {
  open: boolean;
  dismiss: () => void;
  anchor: React.RefObject<HTMLElement | null>;
  t?: boolean;
}

export const Popover: React.FC<Props> = React.memo<Props>(({ children, open, dismiss, anchor, t }) => {
  return (
    <Overlay open={open} dismiss={dismiss} anchor={anchor} t={t}>
      <div className="shadow-lg p-2 bg-white">{children}</div>
    </Overlay>
  );
});
