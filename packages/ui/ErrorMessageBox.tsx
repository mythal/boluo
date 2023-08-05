import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export const ErrorMessageBox = ({ children }: Props) => {
  return <div className="w-full bg-error-100 border border-error-200 rounded py-2 px-4">{children}</div>;
};
