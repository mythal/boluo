import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="view-height flex items-start justify-center px-8 pt-8 md:items-center">
      <div className="border-card-border shadow-1/2 bg-card-bg shadow-card-shadow w-full rounded-sm border p-6 md:w-[20rem]">
        {children}
      </div>
    </div>
  );
}
