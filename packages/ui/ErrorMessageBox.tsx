import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export const ErrorMessageBox = ({ children }: Props) => {
  return <div className="bg-error-100 border-error-200 w-full rounded border px-4 py-2">{children}</div>;
};
