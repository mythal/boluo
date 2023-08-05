import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex view-height items-start justify-center pt-[20vh] px-8">
      <div className="w-full md:w-[30rem] rounded border border-surface-100 bg-lowest p-6 shadow-1/2 shadow-gray-100">
        {children}
      </div>
    </div>
  );
}
