import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export const ErrorMessageBox = ({ children }: Props) => {
  return (
    <aside className="bg-errors-bg border-errors-border shadow-errors-border w-full rounded border px-4 py-2 shadow-[0_1px_0_0]">
      {children}
    </aside>
  );
};
