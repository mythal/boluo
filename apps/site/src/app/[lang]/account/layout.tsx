import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="view-height flex items-start justify-center px-8 pt-[20vh]">
      <div className="border-surface-100 bg-lowest shadow-1/2 w-full rounded border p-6 shadow-gray-100 md:w-[30rem]">
        {children}
      </div>
    </div>
  );
}
