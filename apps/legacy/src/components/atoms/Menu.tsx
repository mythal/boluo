import * as React from 'react';

interface Props {
  children: React.ReactNode;
  dismiss: () => void;
}

function Menu({ children, dismiss }: Props) {
  return (
    <div
      className="bg-legacy-menu-background animate-legacy-menu-enter w-48 [transform:translateY(-1rem)] rounded-[5px] p-2 opacity-0 [box-shadow:0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]"
      onClick={dismiss}
    >
      {children}
    </div>
  );
}

export default Menu;
