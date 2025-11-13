import type { ReactNode } from 'react';
import { BackLink } from '../../../../components/BackLink';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="border-border-raised shadow-1/2 bg-surface-raised shadow-elevation-raised-shadow w-full rounded-sm border p-6 md:w-[20rem]">
      <BackLink />
      {children}
    </div>
  );
}
