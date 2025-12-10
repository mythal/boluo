import React, { type ReactNode } from 'react';
import ReactDOM from 'react-dom';

const root = document.getElementById('portal') as HTMLDivElement;

export const Portal: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  return ReactDOM.createPortal(children, root);
});
