import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export const ErrorMessageBox = ({ children }: Props) => {
  return (
    <aside className="ErrorMessageBox bg-state-danger-bg border-state-danger-border w-full rounded border px-4 py-2 shadow-[0_1px_0_0_var(--color-state-danger-border)]">
      {children}
    </aside>
  );
};
