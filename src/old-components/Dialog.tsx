import React from 'react';
import ReactDOM from 'react-dom';
import { getRoot } from '../dom';
import { cls } from '../utils';

interface Props {
  className?: string;
  dismiss: () => void;
  open?: boolean;
}

export const Dialog: React.FC<Props> = ({ dismiss, children, className, open }) => {
  if (open === false) {
    return null;
  }
  return ReactDOM.createPortal(
    <div className="mask" onClick={dismiss}>
      <div className={cls('bg-white shadow-xl', className)} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    getRoot()
  );
};
