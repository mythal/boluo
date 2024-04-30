import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="view-height flex items-start justify-center px-8 pt-8 md:items-center">
      <div className="border-surface-100 shadow-1/2 bg-lowest w-full rounded-sm border p-6 shadow-gray-100 md:w-[20rem]">
        {children}
      </div>
    </div>
  );
}
